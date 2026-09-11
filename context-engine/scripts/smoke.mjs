import { chromium } from "playwright";

// End-to-end smoke test. Boots nothing itself — start the app first:
//
//   npm run seed -- --force  (the suite writes, so it wants a clean database)
//   npm run dev              (in one terminal)
//   node scripts/smoke.mjs   (in another)
//
// Runs the demo the product exists for: drop one messy note in the inbox,
// check it became the right members, event and tasks, then ask the course
// about it. Also checks that questions the records cannot answer are refused
// rather than answered from loosely-matching rows.


const EXE = "/opt/pw-browsers/chromium";
const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const NOTE =
  "John Smith called. He's playing in the Member-Guest with Mike. Wants an early tee time and asked if his guest can park near the clubhouse. Need to confirm shirt sizes.";

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  (ok ? pass++ : fail++);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra && !ok ? ` — ${extra}` : ""}`);
};

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

// ---------- Command Center loads with real data ----------
await page.goto(BASE, { waitUntil: "networkidle" });
const body = await page.textContent("body");
check("Command Center renders", body.includes("Course Command Center"));
check("Attention section present", body.includes("Attention needed"));
check("Member-Guest surfaces in attention", /Member-Guest is 5 days away/.test(body), body.slice(0, 400));
check("Overdue tasks surface", /tasks are overdue/.test(body));

// ---------- The magic moment ----------
await page.fill("#note", NOTE);
await page.click("text=Read this note");
await page.waitForSelector("text=What this note says", { timeout: 20000 });

const engine = (await page.textContent("body")).includes("Read by Claude")
  ? "claude" : "fallback";
console.log(`  (extraction engine: ${engine})`);

const members = await page.inputValue("#f-members");
check("extracted John Smith", members.includes("John Smith"), members);
check("extracted Mike", members.includes("Mike"), members);

const eventInput = await page.inputValue("#f-event");
check("extracted Member-Guest event", /Member-Guest/i.test(eventInput), eventInput);

const taskInputs = await page.locator('input[placeholder="Task"]').all();
const titles = await Promise.all(taskInputs.map((t) => t.inputValue()));
console.log("  extracted tasks:", JSON.stringify(titles));
check("extracted 3 tasks", titles.length === 3, `got ${titles.length}`);
check("task: tee time", titles.some((t) => /tee time/i.test(t)), titles.join(" | "));
check("task: parking", titles.some((t) => /park/i.test(t)), titles.join(" | "));
check("task: shirt sizes", titles.some((t) => /shirt size/i.test(t)), titles.join(" | "));

// user edits before saving — the whole point of the preview step
await taskInputs[0].fill("Confirm early tee time for Saturday");

// The suite writes as it goes, so it wants a freshly seeded database. Since
// the note guard landed, a second run against the same database is refused
// here rather than quietly adding another copy of everything — which is the
// better failure, but only if it says so instead of timing out.
await page.click("text=Save to course");
const savedMessage = await page
  .waitForSelector("text=/Saved — \\d+ tasks? created|already recorded/i", { timeout: 20000 })
  .then((el) => el.textContent());

if (/already recorded/i.test(savedMessage)) {
  console.log("\n  This database already holds the example note from an earlier run.");
  console.log("  Reseed, then run again:  npm run seed -- --force\n");
  await browser.close();
  process.exit(1);
}
check("note saved with tasks", true);

// ---------- the same note again is refused, not duplicated ----------
// Re-clicking "Try an example" between rehearsals used to fan the same note
// out into a second copy of every record it made.
{
  const countRows = async (text) =>
    page.locator(`text=${JSON.stringify(text)}`).count();
  // Counted on a freshly loaded dashboard both times, so the comparison is
  // against what the page actually renders rather than a mid-refresh DOM.
  await page.goto(BASE, { waitUntil: "networkidle" });
  const before = await countRows("Confirm early tee time for Saturday");

  await page.fill("#note", NOTE);
  await page.click("text=Read this note");
  await page.waitForSelector("text=What this note says", { timeout: 30000 });
  await page.click("text=Save to course");
  await page.waitForSelector("text=/already recorded/i", { timeout: 20000 });
  check("duplicate note refused", true);

  await page.goto(BASE, { waitUntil: "networkidle" });
  const after = await countRows("Confirm early tee time for Saturday");
  check("duplicate note created no second task", after === before, `${before} → ${after}`);
}

// ---------- The edit survived, and the note connected the dots ----------
await page.goto(`${BASE}/members`, { waitUntil: "networkidle" });
const membersPage = await page.textContent("body");
check("John Smith on members list", membersPage.includes("John Smith"));
check("awaiting-reply flag set from note", membersPage.includes("Awaiting reply"));

await page
  .locator('a[href^="/members/"]')
  .filter({ hasText: "John Smith" })
  .first()
  .click();
await page.waitForURL(/\/members\/[a-z0-9]+$/, { timeout: 15000 });
await page.waitForLoadState("networkidle");
check("landed on John Smith's profile", (await page.textContent("h1")).includes("John Smith"));
const profile = await page.textContent("body");
check("edited task title persisted on the named member", profile.includes("Confirm early tee time for Saturday"), profile.slice(0, 300));
check("shirt sizes task on profile", /shirt size/i.test(profile));
check("note appears as context", profile.includes("John Smith called"));
check("Member-Guest linked to member", profile.includes("Member-Guest"));

// ---------- Ask the Course ----------
await page.goto(`${BASE}/ask`, { waitUntil: "networkidle" });
await page.click("text=What do I know about John Smith?");
await page.waitForSelector("text=/Claude ·|Record search ·/", { timeout: 30000 });
const answer = await page.textContent("body");
check("answer cites the new context", /shirt size|tee time|park/i.test(answer), answer.slice(-600));

// grounding: a question with no records must not be answered
await page.fill('input[placeholder="Ask about the course…"]', "What is the pool schedule?");
await page.press('input[placeholder="Ask about the course…"]', "Enter");
await page.waitForTimeout(2500);
const grounded = await page.textContent("body");
check("refuses to answer what it doesn't know", grounded.includes("I don't have that information yet"), grounded.slice(-400));


// ---------- Grounding sweep: what it will and won't answer ----------
const QUESTIONS = [
  ["Give me my top 5 priorities today", true],
  ["What is overdue?", true],
  ["What's happening this weekend?", true],
  ["Who do I need to follow up with?", true],
  ["Who is responsible for cart staging?", true],
  ["What tournaments are coming up?", true],
  ["What is the pool schedule?", false],
  ["How much does a tennis membership cost?", false],
];
for (const [q, shouldAnswer] of QUESTIONS) {
  await page.goto(`${BASE}/ask`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Ask about the course…"]', q);
  await page.press('input[placeholder="Ask about the course…"]', "Enter");
  await page.waitForSelector("text=/Claude ·|Record search ·|Nothing matched/", { timeout: 30000 });
  const answered = !(await page.textContent("body")).includes("I don't have that information yet");
  check(`${shouldAnswer ? "answers" : "declines"}: ${q}`, answered === shouldAnswer);
}

// ---------- Tasks page ----------
await page.goto(`${BASE}/tasks?filter=overdue`, { waitUntil: "networkidle" });
const tasksPage = await page.textContent("body");
check("overdue filter shows only overdue", tasksPage.includes("Overdue") && !/Nothing here/.test(tasksPage));

// ---------- Mobile ----------
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE, { waitUntil: "networkidle" });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
check("no horizontal scroll at 390px", overflow <= 0, `overflow ${overflow}px`);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
