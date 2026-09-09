import * as z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MODEL, aiEnabled, anthropic, type Engine } from "./anthropic";
import { startOfDay, today } from "./dates";

/// Note → structured context.
///
/// The Head Pro types one messy sentence. This turns it into members, an
/// event, an interaction and a set of tasks — which the user then edits before
/// anything is written. Nothing here saves; `commitExtraction` in
/// app/actions.ts does that, after the user has seen and corrected it.

export const ExtractionSchema = z.object({
  memberNames: z
    .array(z.string())
    .describe("Full names of members mentioned. Empty if none."),
  eventName: z
    .string()
    .nullable()
    .describe("The event or tournament this is about, if any."),
  topic: z.string().describe("A four-to-six word summary of what this note is about."),
  source: z
    .enum(["PHONE", "EMAIL", "TEXT", "IN_PERSON", "NOTE"])
    .describe("How this reached the pro shop. NOTE if unstated."),
  needsResponse: z
    .boolean()
    .describe("True if a member asked something that still needs an answer."),
  tasks: z
    .array(
      z.object({
        title: z.string().describe("Imperative, specific. e.g. 'Confirm shirt sizes'"),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
        dueDate: z
          .string()
          .nullable()
          .describe("ISO date (YYYY-MM-DD) if the note implies one, else null."),
      }),
    )
    .describe("One task per distinct thing that has to happen. Empty if none."),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export type ExtractionResult = Extraction & { engine: Engine };

type Known = { members: { name: string }[]; events: { name: string; date: Date }[] };

export async function extractFromNote(note: string, known: Known): Promise<ExtractionResult> {
  if (aiEnabled()) {
    try {
      const parsed = await extractWithClaude(note, known);
      return {
        ...parsed,
        memberNames: orderByMention(note, parsed.memberNames),
        engine: "claude",
      };
    } catch (err) {
      // A key that is present but rejected, rate-limited, or unreachable must
      // not lose the note — fall through to the parser rather than throwing.
      console.error("Claude extraction failed, using fallback parser:", err);
    }
  }
  return { ...extractWithRules(note, known), engine: "fallback" };
}

// ---------------------------------------------------------------- Claude

async function extractWithClaude(note: string, known: Known): Promise<Extraction> {
  const system = [
    "You turn a golf course Head Professional's shorthand notes into structured operational records.",
    `Today is ${today().toISOString().slice(0, 10)}.`,
    "",
    "Rules:",
    "- Extract only what the note says. Never invent a member, event, date or task.",
    "- Match member and event names to the known lists below when the note plainly refers to them; otherwise use the note's own wording.",
    "- One task per distinct action. 'Wants an early tee time and asked about parking' is two tasks.",
    "- Write task titles as instructions to the shop: 'Confirm early tee time', not 'John wants early tee time'.",
    "- Resolve relative dates ('Saturday', 'next Friday') against today's date.",
    "",
    `Known members: ${known.members.map((m) => m.name).join(", ") || "(none)"}`,
    `Known events: ${
      known.events
        .map((e) => `${e.name} (${e.date.toISOString().slice(0, 10)})`)
        .join(", ") || "(none)"
    }`,
  ].join("\n");

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: note }],
    output_config: { format: zodOutputFormat(ExtractionSchema) },
  });

  if (!response.parsed_output) throw new Error("Claude returned no parseable extraction");
  return response.parsed_output;
}

// ---------------------------------------------------------------- fallback

const SOURCE_HINTS: [RegExp, Extraction["source"]][] = [
  [/\b(called|phoned|rang|voicemail|left a message)\b/i, "PHONE"],
  [/\b(emailed|email|wrote in)\b/i, "EMAIL"],
  [/\b(texted|text(ed)? me|sms)\b/i, "TEXT"],
  [/\b(stopped by|came in|caught me|in the shop|at the turn)\b/i, "IN_PERSON"],
];

/** Clause openers that mean "something has to happen". */
const TASK_TRIGGERS: [RegExp, (rest: string) => string][] = [
  [/^need(s)? to\s+(.*)/i, (r) => r],
  [/^needs\s+(.*)/i, (r) => `Arrange ${r}`],
  [/^(please\s+)?(confirm|check|book|order|call|email|arrange|schedule|set up|follow up on)\b(.*)/i, (r) => r],
  [/^asked (if|whether|about)\s+(.*)/i, (r) => `Confirm ${r}`],
  [/^(wants|would like|requesting|requested|asking for)\s+(.*)/i, (r) => `Confirm ${r}`],
  [/^wondering (if|about)\s+(.*)/i, (r) => `Confirm ${r}`],
];

const QUESTION_HINT = /\b(asked|asking|wants|would like|wondering|requested|can (he|she|they|we)|\?)/i;

export function extractWithRules(note: string, known: Known): Extraction {
  const memberNames = orderByMention(
    note,
    known.members.filter((m) => mentionsName(note, m.name)).map((m) => m.name),
  );

  const event = matchEvent(note, known.events);

  const source =
    SOURCE_HINTS.find(([re]) => re.test(note))?.[1] ?? ("NOTE" as const);

  const tasks: Extraction["tasks"] = [];
  for (const clause of splitClauses(note)) {
    const title = taskTitleFrom(clause);
    if (!title) continue;
    if (tasks.some((t) => t.title.toLowerCase() === title.toLowerCase())) continue;
    tasks.push({
      title,
      priority: /\b(urgent|asap|today|immediately|right away)\b/i.test(clause)
        ? "HIGH"
        : "MEDIUM",
      dueDate: event ? startOfDay(event.date).toISOString().slice(0, 10) : null,
    });
  }

  return {
    memberNames,
    eventName: event?.name ?? null,
    topic: topicFrom(note, memberNames, event?.name ?? null),
    source,
    needsResponse: QUESTION_HINT.test(note),
    tasks,
  };
}

/// Whoever the note names first is its subject, and tasks from the note hang
/// off them. Ordering by database order instead would attach "confirm shirt
/// sizes" to whichever member happened to be inserted first — which is how
/// John Smith's tasks once ended up on Mike Brennan's profile.
function orderByMention(note: string, names: string[]): string[] {
  const at = (name: string) => {
    const idx = firstIndexOf(note, name);
    if (idx >= 0) return idx;
    const first = name.split(/\s+/)[0];
    const byFirst = first.length > 2 ? firstIndexOf(note, first) : -1;
    return byFirst >= 0 ? byFirst : Number.MAX_SAFE_INTEGER;
  };
  return [...names].sort((a, b) => at(a) - at(b));
}

function firstIndexOf(note: string, phrase: string): number {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return note.search(new RegExp(`\\b${escaped}\\b`, "i"));
}

/// Notes use the short form of an event's name — "the Member-Guest", not
/// "Men's Member-Guest" — so try the full name first, then progressively
/// shorter tails, and keep the longest thing that actually matched.
function matchEvent<T extends { name: string }>(note: string, events: T[]): T | undefined {
  let best: { event: T; length: number } | undefined;
  for (const event of events) {
    for (const candidate of nameCandidates(event.name)) {
      if (!mentionsPhrase(note, candidate)) continue;
      if (!best || candidate.length > best.length) best = { event, length: candidate.length };
      break;
    }
  }
  return best?.event;
}

function nameCandidates(name: string): string[] {
  const words = name.split(/\s+/);
  const out = [name];
  for (let i = 1; i < words.length; i++) {
    const tail = words.slice(i).join(" ");
    // Short tails ("Day", "Camp") are too generic to identify an event.
    if (tail.length >= 7) out.push(tail);
  }
  return out;
}

function mentionsName(note: string, name: string): boolean {
  if (mentionsPhrase(note, name)) return true;
  // "John Smith" should also match a note that only says "John", but only when
  // that first name is unambiguous in the note's own text.
  const first = name.split(/\s+/)[0];
  return first.length > 2 && mentionsPhrase(note, first);
}

function mentionsPhrase(note: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(note);
}

/** Sentences, then "and"-joined halves, so one sentence can yield two tasks. */
function splitClauses(note: string): string[] {
  return note
    .split(/(?<=[.!?;])\s+|\n+/)
    .flatMap((sentence) => sentence.split(/\s+and\s+(?=\w)/i))
    .map((c) => c.replace(/^(he|she|they|also|then)\s+/i, "").trim())
    .filter(Boolean);
}

function taskTitleFrom(clause: string): string | null {
  for (const [re, build] of TASK_TRIGGERS) {
    const m = clause.match(re);
    if (!m) continue;
    // The captured remainder is the last non-empty group.
    const rest = m.slice(1).filter(Boolean).pop();
    if (!rest) continue;
    const cleaned = build(rest).replace(/[.?!,;]+$/, "").trim();
    if (cleaned.length < 3) continue;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return null;
}

function topicFrom(note: string, members: string[], eventName: string | null): string {
  if (eventName && members.length) return `${members[0]} — ${eventName}`;
  if (eventName) return eventName;
  if (members.length) return `${members[0]} follow-up`;
  const first = note.split(/(?<=[.!?])\s+/)[0] ?? note;
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}
