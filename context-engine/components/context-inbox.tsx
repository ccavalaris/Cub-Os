"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InteractionSource, Priority } from "@prisma/client";
import { previewNote, commitNote } from "@/app/actions";
import type { ExtractionResult } from "@/lib/extract";

type DraftTask = { title: string; priority: Priority; dueDate: string | null };

type Draft = {
  memberNames: string[];
  eventName: string;
  topic: string;
  source: InteractionSource;
  needsResponse: boolean;
  tasks: DraftTask[];
  engine: ExtractionResult["engine"];
};

const SOURCES: InteractionSource[] = ["PHONE", "EMAIL", "TEXT", "IN_PERSON", "NOTE"];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

const SOURCE_LABEL: Record<InteractionSource, string> = {
  PHONE: "Phone",
  EMAIL: "Email",
  TEXT: "Text",
  IN_PERSON: "In person",
  NOTE: "Note",
};

const EXAMPLE =
  "John Smith called. He's playing in the Member-Guest with Mike. Wants an early tee time and asked if his guest can park near the clubhouse. Need to confirm shirt sizes.";

export function ContextInbox() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const [saving, startSaving] = useTransition();

  function read() {
    const text = note.trim();
    if (!text) return;
    setError(null);
    setSaved(null);
    startReading(async () => {
      try {
        const result = await previewNote(text);
        setDraft({
          memberNames: result.memberNames,
          eventName: result.eventName ?? "",
          topic: result.topic,
          source: result.source,
          needsResponse: result.needsResponse,
          tasks: result.tasks,
          engine: result.engine,
        });
      } catch {
        setError("Couldn't read that note. Try again.");
      }
    });
  }

  function save() {
    if (!draft) return;
    startSaving(async () => {
      try {
        const { taskCount } = await commitNote({
          note: note.trim(),
          memberNames: draft.memberNames,
          eventName: draft.eventName.trim() || null,
          topic: draft.topic,
          source: draft.source,
          needsResponse: draft.needsResponse,
          tasks: draft.tasks,
        });
        setSaved(
          taskCount === 0
            ? "Saved to the course."
            : `Saved — ${taskCount} task${taskCount === 1 ? "" : "s"} created.`,
        );
        setNote("");
        setDraft(null);
        router.refresh();
      } catch {
        setError("Couldn't save that. Try again.");
      }
    });
  }

  function patch(changes: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...changes } : d));
  }

  function patchTask(index: number, changes: Partial<DraftTask>) {
    setDraft((d) =>
      d
        ? { ...d, tasks: d.tasks.map((t, i) => (i === index ? { ...t, ...changes } : t)) }
        : d,
    );
  }

  return (
    <div className="overflow-hidden rounded-[5px] border border-line bg-surface shadow-[0_1px_2px_rgba(32,31,27,0.05)]">
      {/* A brass edge marks the one input the whole product is built around. */}
      <div aria-hidden className="h-[3px] bg-brass" />

      <div className="p-4">
        <label htmlFor="note" className="label mb-2 block text-faint">
          Context inbox
        </label>
      <textarea
        id="note"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) read();
        }}
        rows={2}
        style={{ minHeight: "3.2rem" }}
        placeholder="What happened? — “John Smith called about bringing two guests Saturday.”"
        className="w-full resize-y border-0 bg-transparent text-[17px] leading-relaxed text-ink outline-none placeholder:text-faint"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={read}
          disabled={reading || !note.trim()}
          className={`rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            note.trim()
              ? "bg-accent text-ground hover:opacity-90"
              : "border border-line bg-surface text-faint"
          }`}
        >
          {reading ? "Reading…" : "Read this note"}
        </button>

        {!note && !draft && (
          <button
            type="button"
            onClick={() => setNote(EXAMPLE)}
            className="text-[12px] text-muted underline underline-offset-2 hover:text-ink"
          >
            Try an example
          </button>
        )}

        {saved && <span className="text-[12px] text-accent">{saved}</span>}
        {error && <span className="text-[12px] text-alert">{error}</span>}
      </div>

      {draft && (
        <div className="-mx-4 -mb-4 mt-4 border-t border-line bg-sunken px-4 pb-4 pt-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="label text-muted">What this note says</p>
            <span
              className="label text-faint"
              title={
                draft.engine === "claude"
                  ? "Read by Claude"
                  : "Read by the built-in pattern reader — no API key is set"
              }
            >
              {draft.engine === "claude" ? "Read by Claude" : "Pattern reader"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Members" htmlFor="f-members">
              <input
                id="f-members"
                value={draft.memberNames.join(", ")}
                onChange={(e) =>
                  patch({
                    memberNames: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="None"
                className="w-full rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
              />
            </Field>

            <Field label="Event" htmlFor="f-event">
              <input
                id="f-event"
                value={draft.eventName}
                onChange={(e) => patch({ eventName: e.target.value })}
                placeholder="None"
                className="w-full rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
              />
            </Field>

            <Field label="Topic" htmlFor="f-topic">
              <input
                id="f-topic"
                value={draft.topic}
                onChange={(e) => patch({ topic: e.target.value })}
                className="w-full rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
              />
            </Field>

            <Field label="Came in by" htmlFor="f-source">
              <div className="flex items-center gap-2">
                <select
                  id="f-source"
                  value={draft.source}
                  onChange={(e) => patch({ source: e.target.value as InteractionSource })}
                  className="rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABEL[s]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    checked={draft.needsResponse}
                    onChange={(e) => patch({ needsResponse: e.target.checked })}
                    className="accent-[var(--color-accent)]"
                  />
                  Awaiting reply
                </label>
              </div>
            </Field>
          </div>

          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="label text-muted">Tasks ({draft.tasks.length})</p>
              <button
                type="button"
                onClick={() =>
                  patch({
                    tasks: [...draft.tasks, { title: "", priority: "MEDIUM", dueDate: null }],
                  })
                }
                className="text-[12px] text-muted underline underline-offset-2 hover:text-ink"
              >
                Add task
              </button>
            </div>

            {draft.tasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-2.5 py-2 text-[13px] text-faint">
                No tasks found in this note.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {draft.tasks.map((task, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-1.5">
                    <input
                      value={task.title}
                      onChange={(e) => patchTask(i, { title: e.target.value })}
                      placeholder="Task"
                      className="min-w-0 flex-1 rounded-[4px] border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
                    />
                    <select
                      value={task.priority}
                      onChange={(e) => patchTask(i, { priority: e.target.value as Priority })}
                      className="rounded-md border border-line bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-accent"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={task.dueDate ?? ""}
                      onChange={(e) => patchTask(i, { dueDate: e.target.value || null })}
                      className="tnum rounded-md border border-line bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => patch({ tasks: draft.tasks.filter((_, j) => j !== i) })}
                      aria-label={`Remove task ${i + 1}`}
                      className="rounded-lg px-2 py-1.5 text-[13px] text-faint hover:text-alert"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-[4px] bg-accent px-3.5 py-1.5 text-[13px] font-medium text-ground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save to course"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] text-muted hover:text-ink"
            >
              Discard
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label mb-1.5 block text-faint">
        {label}
      </label>
      {children}
    </div>
  );
}
