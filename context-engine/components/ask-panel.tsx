"use client";

import { useRef, useState, useTransition } from "react";
import { askCourse } from "@/app/actions";
import type { Answer } from "@/lib/ask";

type Turn = { question: string; answer: Answer | null };

const SUGGESTIONS = [
  "Give me my top 5 priorities today",
  "What is overdue?",
  "What do I know about John Smith?",
  "Who do I need to follow up with?",
  "What do I need to worry about for the Member-Guest?",
  "Who is responsible for cart staging?",
];

export function AskPanel({ aiEnabled }: { aiEnabled: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setQuestion("");
    setTurns((t) => [...t, { question: q, answer: null }]);
    start(async () => {
      const answer = await askCourse(q);
      setTurns((t) =>
        t.map((turn, i) => (i === t.length - 1 ? { ...turn, answer } : turn)),
      );
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="sticky top-[104px] z-10 mb-5 flex gap-2 rounded-xl border border-line bg-surface p-2"
      >
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about the course…"
          className="min-w-0 flex-1 bg-transparent px-1.5 text-[15px] outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={pending || !question.trim()}
          /* Resting state is an outline, not a faded fill: a washed-out green
             button reads as broken rather than as waiting for a question. */
          className={`shrink-0 rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            question.trim()
              ? "bg-accent text-ground hover:opacity-90"
              : "border border-line bg-surface text-faint"
          }`}
        >
          {pending ? "…" : "Ask"}
        </button>
      </form>

      {turns.length === 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Try asking
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-[13px] text-muted transition-colors hover:border-faint hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
          {!aiEnabled && (
            <p className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-muted">
              No <code className="text-[12px]">ANTHROPIC_API_KEY</code> is set, so answers
              come from the built-in search over your records rather than from Claude — the
              matching tasks, events, notes and members, grouped by what matters first. Set a
              key and restart to get written answers.
            </p>
          )}
        </div>
      )}

      <ul className="space-y-5">
        {turns.map((turn, i) => (
          <li key={i}>
            <p className="mb-1.5 text-[15px] font-medium">{turn.question}</p>
            {turn.answer === null ? (
              <p className="text-[14px] text-faint">Looking through the course records…</p>
            ) : (
              <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                  {turn.answer.text}
                </p>
                <p className="mt-2.5 border-t border-line-soft pt-2 text-[12px] text-faint">
                  {turn.answer.engine === "none"
                    ? "Nothing matched"
                    : `${
                        turn.answer.engine === "claude" ? "Claude" : "Record search"
                      } · from ${describe(turn.answer.sources)}`}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function describe(s: Answer["sources"]): string {
  const parts: string[] = [];
  if (s.tasks) parts.push(`${s.tasks} task${s.tasks === 1 ? "" : "s"}`);
  if (s.events) parts.push(`${s.events} event${s.events === 1 ? "" : "s"}`);
  if (s.interactions) parts.push(`${s.interactions} note${s.interactions === 1 ? "" : "s"}`);
  if (s.members) parts.push(`${s.members} member${s.members === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "no records";
}
