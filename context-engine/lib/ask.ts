import { MODEL, aiEnabled, anthropic, type Engine } from "./anthropic";
import { retrieve, renderContext, isEmpty, type Retrieved } from "./retrieve";
import { daysOut, formatLongDate, today } from "./dates";
import { taskState } from "./derive";

/// Ask the Course.
///
/// Retrieve first, then answer only from what came back. The system prompt
/// forbids invention and the retrieved block is the only ground truth the
/// model gets — when retrieval comes back empty the model is never called at
/// all, so "I don't have that information yet" is a guarantee of the control
/// flow rather than a hope about the model's behaviour.

export const NO_INFO = "I don't have that information yet.";

export type Answer = {
  text: string;
  engine: Engine | "none";
  sources: { members: number; events: number; tasks: number; interactions: number };
};

export async function ask(courseId: string, question: string): Promise<Answer> {
  const retrieved = await retrieve(courseId, question);
  const sources = {
    members: retrieved.members.length,
    events: retrieved.events.length,
    tasks: retrieved.tasks.length,
    interactions: retrieved.interactions.length,
  };

  // The question is about something the records have never heard of. Answering
  // from loosely word-matching rows would be worse than admitting it, so the
  // model is never called — "I don't have that" is a property of the control
  // flow here, not something the model has to be trusted to say.
  if (!retrieved.subjectMatched) {
    return {
      text: `${NO_INFO} Nothing in the course records mentions ${retrieved.subjects
        .map((t) => `“${t}”`)
        .join(" or ")} — add a note in the Context Inbox and ask again.`,
      engine: "none",
      sources,
    };
  }

  if (isEmpty(retrieved)) {
    // An operational question with a real, empty answer ("nothing is overdue")
    // is not the same as not knowing.
    if (retrieved.intents.length > 0) {
      return { text: emptyIntentAnswer(retrieved.intents), engine: "none", sources };
    }
    return {
      text: `${NO_INFO} Nothing in the course records matches that question yet — add a note in the Context Inbox and ask again.`,
      engine: "none",
      sources,
    };
  }

  if (aiEnabled()) {
    try {
      return { text: await answerWithClaude(question, retrieved), engine: "claude", sources };
    } catch (err) {
      console.error("Claude answer failed, using fallback summary:", err);
    }
  }

  return { text: summarise(retrieved), engine: "fallback", sources };
}

function emptyIntentAnswer(intents: Retrieved["intents"]): string {
  if (intents.includes("overdue")) return "Nothing is overdue.";
  if (intents.includes("followups")) return "Nobody is waiting on a reply.";
  if (intents.includes("today")) return "Nothing is scheduled or due today.";
  if (intents.includes("week")) return "Nothing is scheduled or due in the next week.";
  return NO_INFO;
}

async function answerWithClaude(question: string, retrieved: Retrieved): Promise<string> {
  const system = [
    "You are the operations assistant for a private golf course, answering the Head Professional.",
    `Today is ${formatLongDate(today())}.`,
    "",
    "You will be given the course records that matched this question. Those records are the only",
    "thing you know. Rules, in order of importance:",
    "",
    `1. Never state anything the records do not say. If they do not answer the question, say exactly: "${NO_INFO}"`,
    "2. If they answer it only partly, give the part you have and say plainly what is missing.",
    "3. Never invent a member, event, date, score, count or task.",
    "4. Be brief. The Head Pro is reading this on a phone between groups.",
    "5. Lead with the answer. Put open items and deadlines before background.",
    "6. Plain sentences and short bullets. No preamble, no sign-off, no markdown headers.",
  ].join("\n");

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 1500,
    // Answering does benefit from some deliberation — it has to weigh which of
    // the retrieved records actually bear on the question — but not enough to
    // justify a long pause on a phone between groups.
    output_config: { effort: "medium" },
    system,
    messages: [
      {
        role: "user",
        content: `Question: ${question}\n\nCourse records that matched:\n\n${renderContext(retrieved)}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return text || NO_INFO;
}

/// No-key answer: the matching records, grouped and ordered the way the
/// dashboard orders them. It is a search result and reads like one — the UI
/// labels it as such rather than passing it off as a generated answer.
function summarise(r: Retrieved): string {
  const now = today();
  const lines: string[] = [];

  const overdue = r.tasks.filter((t) => taskState(t) === "overdue");
  const open = r.tasks.filter((t) => taskState(t) !== "complete" && taskState(t) !== "overdue");

  if (overdue.length) {
    lines.push(`Overdue (${overdue.length}):`);
    for (const t of overdue.slice(0, 6)) {
      const late = t.dueDate ? Math.abs(daysOut(t.dueDate, now)) : 0;
      lines.push(
        `• ${t.title}${t.owner ? ` — ${t.owner}` : ""}${
          t.dueDate ? `, was due ${late} day${late === 1 ? "" : "s"} ago` : ""
        }`,
      );
    }
  }

  if (r.events.length) {
    if (lines.length) lines.push("");
    lines.push("Events:");
    for (const e of r.events.slice(0, 4)) {
      const out = daysOut(e.date, now);
      const when =
        out === 0
          ? "today"
          : out > 0
            ? `in ${out} day${out === 1 ? "" : "s"}`
            : `${-out} day${out === -1 ? "" : "s"} ago`;
      lines.push(
        `• ${e.name} — ${when}, ${e.status.toLowerCase()}, ${e.participants.length} participants`,
      );
    }
  }

  if (open.length) {
    if (lines.length) lines.push("");
    lines.push(`Open items (${open.length}):`);
    for (const t of open.slice(0, 8)) {
      lines.push(
        `• ${t.title}${t.owner ? ` — ${t.owner}` : ""}${
          t.dueDate ? `, due ${t.dueDate.toISOString().slice(0, 10)}` : ""
        }`,
      );
    }
  }

  if (r.interactions.length) {
    if (lines.length) lines.push("");
    lines.push("Recent notes:");
    for (const i of r.interactions.slice(0, 5)) {
      lines.push(
        `• ${i.member ? `${i.member.name}: ` : ""}${i.content}${
          i.needsResponse ? " (awaiting reply)" : ""
        }`,
      );
    }
  }

  if (r.members.length) {
    if (lines.length) lines.push("");
    lines.push(`Members: ${r.members.map((m) => m.name).join(", ")}`);
  }

  return lines.join("\n");
}
