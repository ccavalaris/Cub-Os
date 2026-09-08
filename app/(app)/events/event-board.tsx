"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  toggleTaskAction,
  setTaskOwnerAction,
  addTaskAction,
  deleteTaskAction,
} from "./actions";

type Task = {
  id: string;
  label: string;
  done: boolean;
  ownerId: string | null;
  ownerInitials: string | null;
  ownerName: string | null;
};

type EventRow = {
  id: string;
  name: string;
  kindLabel: string;
  dateLabel: string;
  detail: string;
  location: string;
  daysOutLabel: string;
  daysOut: number;
  needsAttention: boolean;
  tournamentId: string | null;
  tasks: Task[];
};

type Staff = { id: string; name: string };

export default function EventBoard({
  events,
  staff,
}: {
  events: EventRow[];
  staff: Staff[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setError(null);
        after?.();
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="fade-wrap">
      <div className="section">
        <div className="panel-title">Upcoming Events</div>
        <div className="panel-desc">
          Logistics checklists across tournaments, private functions, and member
          events. Assign an owner to an outstanding task so it is clear who is
          carrying it. An event inside a week with open tasks is flagged.
        </div>
        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        {error ? <div className="drawer-error" style={{ marginBottom: 16 }}>{error}</div> : null}

        {events.length === 0 ? (
          <div className="mini-panel">
            <div className="mini-row">No events on the books yet.</div>
          </div>
        ) : null}

        {events.map((ev) => {
          const done = ev.tasks.filter((t) => t.done).length;
          const pct = ev.tasks.length ? Math.round((done / ev.tasks.length) * 100) : 0;
          return (
            <div key={ev.id} className="event-card">
              <div className="event-top">
                <div>
                  <div className="event-name">{ev.name}</div>
                  <div className="event-meta">
                    {ev.dateLabel}
                    {ev.detail ? ` · ${ev.detail}` : ""}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    {ev.needsAttention ? (
                      <span className="event-flag">Needs attention</span>
                    ) : null}
                    <span className="event-meta">
                      {done}/{ev.tasks.length} complete
                    </span>
                  </div>
                  <div className="event-days">{ev.daysOutLabel}</div>
                </div>
              </div>

              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="task-grid">
                {ev.tasks.map((t) => (
                  <div key={t.id} className={`task-row ${t.done ? "done" : ""}`}>
                    <span
                      className="task-check"
                      role="button"
                      tabIndex={0}
                      title={t.done ? "Mark not done" : "Mark done"}
                      onClick={() => !pending && run(() => toggleTaskAction(t.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") run(() => toggleTaskAction(t.id));
                      }}
                    >
                      {t.done ? "✓" : ""}
                    </span>
                    <span className="label">{t.label}</span>
                    {editing === t.id ? (
                      <select
                        className="owner-select"
                        defaultValue={t.ownerId ?? ""}
                        autoFocus
                        onBlur={() => setEditing(null)}
                        onChange={(e) =>
                          run(
                            () =>
                              setTaskOwnerAction({
                                taskId: t.id,
                                ownerId: e.target.value || null,
                              }),
                            () => setEditing(null),
                          )
                        }
                      >
                        <option value="">— unassigned —</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="owner"
                        role="button"
                        tabIndex={0}
                        title={t.ownerName ? `Owned by ${t.ownerName}` : "Assign an owner"}
                        onClick={() => setEditing(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditing(t.id);
                        }}
                      >
                        {t.ownerInitials ?? "+"}
                      </span>
                    )}
                    <span
                      className="task-remove"
                      role="button"
                      tabIndex={0}
                      title="Remove task"
                      onClick={() => !pending && run(() => deleteTaskAction(t.id))}
                    >
                      &times;
                    </span>
                  </div>
                ))}
              </div>

              <div className="event-foot">
                {adding === ev.id ? (
                  <form
                    className="add-task"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const fd = new FormData(form);
                      run(
                        () =>
                          addTaskAction({
                            eventId: ev.id,
                            label: String(fd.get("label") ?? ""),
                            ownerId: String(fd.get("ownerId") ?? "") || null,
                          }),
                        () => setAdding(null),
                      );
                    }}
                  >
                    <input
                      name="label"
                      type="text"
                      placeholder="e.g. Confirm rain plan with the kitchen"
                      autoFocus
                      required
                    />
                    <select name="ownerId" defaultValue="">
                      <option value="">— unassigned —</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn small" type="submit" disabled={pending}>
                      Add
                    </button>
                    <button
                      className="btn ghost small"
                      type="button"
                      onClick={() => setAdding(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button className="btn ghost small" onClick={() => setAdding(ev.id)}>
                    + Add task
                  </button>
                )}
                {ev.tournamentId ? (
                  <Link href="/tournament" className="mini-link">
                    Open tournament ops &rarr;
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
