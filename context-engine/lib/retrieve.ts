import { prisma } from "./prisma";
import { daysOut, today } from "./dates";
import { isOpen, isOverdue, taskState } from "./derive";

/// Retrieval for Ask the Course.
///
/// Scores every record against the question by term overlap, then adds an
/// operational bias — overdue work, today's events and near deadlines outrank
/// a merely word-matching record, because that is the order the Head Pro
/// actually cares about. Returns the top slice of each type.
///
/// At demo scale this could just send the whole database to the model. It
/// doesn't, because the shape that works at 65 records and the shape that
/// works at 6,500 should be the same one.

const STOPWORDS = new Set(
  ("a about all am an and any are as at be been but by can did do does for from get got had has have " +
    "he her him his how i if in into is it its just know me more my need needs of on or our out should " +
    "so tell that the their them then there these they this to too up us was we were what when where " +
    "which who whom why will with would you your").split(" "),
);

/// Words that frame an operational question rather than name its subject.
/// "What is overdue?" is about overdue work, not about a thing called
/// "overdue" — so these are matched as intent, and excluded when deciding
/// whether the question's actual subject exists in the records at all.
const OPERATIONAL = new Set(
  ("agenda brief calendar coming deadline deadlines due give happening information know list " +
    "me my need needs open our overdue owner priorities priority responsible schedule scheduled " +
    "show status summarise summarize summary task tasks tell today tomorrow top upcoming week " +
    "weekend worry follow followup follow-up waiting").split(" "),
);

export type Intent = "overdue" | "today" | "week" | "followups";

export function detectIntents(question: string): Intent[] {
  const q = question.toLowerCase();
  const intents: Intent[] = [];
  if (/\boverdue|behind|late\b/.test(q)) intents.push("overdue");
  if (/\btoday|priorit|right now|worry\b/.test(q)) intents.push("today");
  if (/\bweek|weekend|upcoming|coming up|next few days\b/.test(q)) intents.push("week");
  if (/\bfollow.?up|follow up|waiting|get back|respond|reply\b/.test(q)) intents.push("followups");
  return intents;
}

/** The question's terms minus operational framing — what it is actually about. */
export function subjectTerms(question: string): string[] {
  return terms(question).filter((t) => !OPERATIONAL.has(t));
}

export function terms(question: string): string[] {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .split(/\s+/)
        .map((w) => w.replace(/^'+|'+$/g, ""))
        .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
    ),
  );
}

function overlap(haystack: string, ts: string[]): number {
  if (ts.length === 0) return 0;
  const text = haystack.toLowerCase();
  let hits = 0;
  for (const t of ts) if (text.includes(t)) hits += 1;
  return hits;
}

export type Retrieved = Awaited<ReturnType<typeof retrieve>>;

export async function retrieve(courseId: string, question: string) {
  const ts = terms(question);
  const subjects = subjectTerms(question);
  const intents = detectIntents(question);
  const now = today();

  const [members, events, tasks, interactions] = await Promise.all([
    prisma.member.findMany({ where: { courseId } }),
    prisma.event.findMany({
      where: { courseId },
      include: { participants: { include: { member: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.task.findMany({
      where: { courseId },
      include: { member: true, event: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.interaction.findMany({
      where: { courseId },
      include: { member: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const scoredMembers = members
    .map((m) => ({
      row: m,
      score: overlap(`${m.name} ${m.email ?? ""} ${m.notes ?? ""}`, ts) * 3,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const scoredEvents = events
    .map((e) => {
      const out = daysOut(e.date, now);
      let score = overlap(`${e.name} ${e.description ?? ""}`, ts) * 3;
      if (out === 0) score += 4; // today
      else if (out > 0 && out <= 14) score += 3 - Math.floor(out / 7); // near
      return { row: e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const scoredTasks = tasks
    .map((t) => {
      let score = overlap(
        `${t.title} ${t.description ?? ""} ${t.owner ?? ""} ${t.member?.name ?? ""} ${t.event?.name ?? ""}`,
        ts,
      ) * 2;
      if (isOverdue(t)) score += 4;
      else if (isOpen(t) && t.dueDate && daysOut(t.dueDate, now) <= 7) score += 2;
      if (t.priority === "HIGH" && isOpen(t)) score += 1;
      return { row: t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const scoredInteractions = interactions
    .map((i, idx) => {
      let score = overlap(`${i.content} ${i.member?.name ?? ""}`, ts) * 2;
      if (score > 0 && idx < 10) score += 1; // recency nudge
      if (i.needsResponse) score += 1;
      return { row: i, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const pickedMembers = scoredMembers.slice(0, 6).map((x) => x.row);
  const pickedEvents = scoredEvents.slice(0, 5).map((x) => x.row);
  const pickedTasks = scoredTasks.slice(0, 15).map((x) => x.row);
  const pickedInteractions = scoredInteractions.slice(0, 15).map((x) => x.row);

  // Operational intents pull in records by structure rather than by wording,
  // so "what is overdue?" works even though no record contains the word.
  const add = <T extends { id: string }>(into: T[], extra: T[], cap: number) => {
    const seen = new Set(into.map((r) => r.id));
    for (const row of extra) {
      if (into.length >= cap) break;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      into.push(row);
    }
  };

  if (intents.includes("overdue") || intents.includes("today")) {
    add(pickedTasks, tasks.filter(isOverdue), 20);
  }
  if (intents.includes("today")) {
    add(pickedEvents, events.filter((e) => daysOut(e.date, now) === 0), 8);
    add(
      pickedTasks,
      tasks.filter((t) => isOpen(t) && t.dueDate && daysOut(t.dueDate, now) === 0),
      20,
    );
  }
  if (intents.includes("week")) {
    add(
      pickedEvents,
      events.filter((e) => {
        const out = daysOut(e.date, now);
        return out >= 0 && out <= 7;
      }),
      8,
    );
    add(
      pickedTasks,
      tasks.filter((t) => {
        if (!isOpen(t) || !t.dueDate) return false;
        const out = daysOut(t.dueDate, now);
        return out >= 0 && out <= 7;
      }),
      20,
    );
  }
  if (intents.includes("followups") || intents.includes("today")) {
    add(pickedInteractions, interactions.filter((i) => i.needsResponse && i.member), 18);
  }

  // Does the thing the question is about appear anywhere at all? Asked about
  // the pool when the course has no pool records, the honest answer is that we
  // do not know — not a pile of rows that happened to share a common word.
  const corpus = [
    ...members.map((m) => `${m.name} ${m.email ?? ""} ${m.notes ?? ""}`),
    ...events.map((e) => `${e.name} ${e.description ?? ""}`),
    ...tasks.map((t) => `${t.title} ${t.description ?? ""} ${t.owner ?? ""}`),
    ...interactions.map((i) => i.content),
  ]
    .join(" ")
    .toLowerCase();
  // An operational question ("my top priorities today") is about the course's
  // state rather than about a named thing, so the subject check does not apply
  // to it — it only guards questions that name something, like "the pool".
  const subjectMatched =
    intents.length > 0 ||
    subjects.length === 0 ||
    subjects.some((t) => corpus.includes(t));

  return {
    terms: ts,
    subjects,
    intents,
    subjectMatched,
    members: pickedMembers,
    events: pickedEvents,
    tasks: pickedTasks,
    interactions: pickedInteractions,
  };
}

/** The retrieved records as plain text, for the model or the fallback answer. */
export function renderContext(r: Retrieved): string {
  const now = today();
  const out: string[] = [];

  if (r.members.length) {
    out.push("MEMBERS");
    for (const m of r.members) {
      out.push(
        `- ${m.name}${m.email ? ` <${m.email}>` : ""}${m.phone ? ` ${m.phone}` : ""}${
          m.notes ? ` — ${m.notes}` : ""
        }`,
      );
    }
  }

  if (r.events.length) {
    out.push("", "EVENTS");
    for (const e of r.events) {
      const out_ = daysOut(e.date, now);
      const when =
        out_ === 0
          ? "today"
          : out_ > 0
            ? `in ${out_} day${out_ === 1 ? "" : "s"}`
            : `${-out_} day${out_ === -1 ? "" : "s"} ago`;
      out.push(
        `- ${e.name} — ${e.date.toISOString().slice(0, 10)} (${when}), status ${e.status}, ` +
          `${e.participants.length} participants${e.description ? ` — ${e.description}` : ""}`,
      );
    }
  }

  if (r.tasks.length) {
    out.push("", "TASKS");
    for (const t of r.tasks) {
      out.push(
        `- [${taskState(t)}] ${t.title}` +
          `${t.owner ? ` — owner ${t.owner}` : ""}` +
          `${t.dueDate ? `, due ${t.dueDate.toISOString().slice(0, 10)}` : ""}` +
          `${t.event ? `, event ${t.event.name}` : ""}` +
          `${t.member ? `, member ${t.member.name}` : ""}` +
          `, priority ${t.priority}`,
      );
    }
  }

  if (r.interactions.length) {
    out.push("", "NOTES AND MEMBER INTERACTIONS");
    for (const i of r.interactions) {
      out.push(
        `- ${i.date.toISOString().slice(0, 10)}${i.member ? ` ${i.member.name}` : ""} ` +
          `(${i.source.toLowerCase()}): ${i.content}` +
          `${i.needsResponse ? " [awaiting reply]" : ""}`,
      );
    }
  }

  return out.join("\n");
}

export function isEmpty(r: Retrieved): boolean {
  return (
    r.members.length === 0 &&
    r.events.length === 0 &&
    r.tasks.length === 0 &&
    r.interactions.length === 0
  );
}
