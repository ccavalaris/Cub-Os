"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  setCourseStatusAction,
  toggleHoleAction,
  setPinAction,
  addMaintLogAction,
} from "./actions";

type Hole = {
  id: string;
  number: number;
  par: number;
  yards: number;
  status: "OPEN" | "CART_PATH_ONLY";
  pin: "A" | "B" | "C";
  note: string;
};

type LogEntry = { id: string; label: string; text: string };

const PINS: Array<"A" | "B" | "C"> = ["A", "B", "C"];

export default function CourseBoard({
  status,
  note,
  cartPathCount,
  holes,
  log,
}: {
  status: string;
  note: string;
  cartPathCount: number;
  holes: Hole[];
  log: LogEntry[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  const open = holes.find((h) => h.id === selected) ?? null;

  return (
    <div className="fade-wrap">
      <div className="banner">
        <div className="banner-left">
          <div>
            <div className="banner-title">
              {cartPathCount > 0
                ? `${cartPathCount} hole${cartPathCount > 1 ? "s" : ""} cart-path only`
                : "Full course open"}
            </div>
            <div className="banner-note">
              {status === "OPEN" && cartPathCount > 0
                ? `${note} Cart traffic restricted on ${cartPathCount} hole${
                    cartPathCount > 1 ? "s" : ""
                  } — see the card below.`
                : note}
            </div>
          </div>
        </div>
        <select
          className="banner-select"
          value={status}
          disabled={pending}
          onChange={(e) => run(() => setCourseStatusAction(e.target.value))}
        >
          <option value="OPEN">Course Open</option>
          <option value="RESTRICTED">Restricted Play</option>
          <option value="CLOSED">Course Closed</option>
        </select>
      </div>

      {error ? <div className="drawer-error" style={{ marginBottom: 18 }}>{error}</div> : null}

      <div className="section">
        <div className="panel-title">Hole-by-Hole Status</div>
        <div className="panel-desc">
          Yardages from the championship tees with today&rsquo;s pin positions.
          Pin A = front &middot; B = middle &middot; C = back. Click a hole to open it and
          set the cart-path restriction or move the pin.
        </div>
        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        <div className="holes-grid">
          {holes.map((h) => (
            <div
              key={h.id}
              className={`hole-card ${selected === h.id ? "hole-selected" : ""}`}
              onClick={() => setSelected(selected === h.id ? null : h.id)}
            >
              <div className="hole-top">
                <span className="hole-num">{h.number}</span>
                <span className="hole-par">PAR {h.par}</span>
              </div>
              <span
                className="badge"
                style={
                  h.status === "CART_PATH_ONLY"
                    ? { background: "#F5EBD8", color: "#8A6A2F" }
                    : { background: "#EAF0E6", color: "var(--sage)" }
                }
              >
                {h.status === "OPEN" ? "Open" : "Cart Path Only"}
              </span>
              <div className="hole-info">
                <span className="hole-yards">
                  {h.yards}
                  <span> yds</span>
                </span>
                <span className={`hole-pin pin-${h.pin}`} title={`Pin position ${h.pin}`}>
                  <span className="pin-dot" />
                  Pin {h.pin}
                </span>
              </div>
            </div>
          ))}
        </div>

        {open ? (
          <div className="drawer show">
            <div className="drawer-title">
              Hole {open.number} — par {open.par}, {open.yards} yds
            </div>
            <div className="drawer-note">{open.note}</div>
            <div className="drawer-row" style={{ alignItems: "flex-end", marginTop: 12 }}>
              <div className="field">
                <label>Pin position</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {PINS.map((p) => (
                    <button
                      key={p}
                      className={`instr-pill ${open.pin === p ? "active" : ""}`}
                      disabled={pending}
                      onClick={() => run(() => setPinAction({ holeId: open.id, pin: p }))}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button
                className="btn"
                disabled={pending}
                onClick={() => run(() => toggleHoleAction(open.id))}
              >
                {open.status === "OPEN" ? "Mark cart path only" : "Reopen to carts"}
              </button>
              <button className="btn ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="section maint-log">
        <div className="panel-title">Maintenance Log</div>
        <div className="panel-desc">Entries from the grounds crew, most recent first.</div>
        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        <form
          className="ruling-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            run(async () => {
              const res = await addMaintLogAction({
                label: String(fd.get("label") ?? ""),
                text: String(fd.get("text") ?? ""),
              });
              if (res.ok) form.reset();
              return res;
            });
          }}
        >
          <div className="field" style={{ maxWidth: 120 }}>
            <label htmlFor="label">Time</label>
            <input id="label" name="label" type="text" placeholder="6:10a" required />
          </div>
          <div className="field" style={{ flex: 3 }}>
            <label htmlFor="text">Entry</label>
            <input
              id="text"
              name="text"
              type="text"
              placeholder="Cups reset on 1, 5, 9, 14."
              required
            />
          </div>
          <button className="btn" type="submit" disabled={pending}>
            Add entry
          </button>
        </form>

        {log.length === 0 ? (
          <div className="mini-row">No entries logged yet.</div>
        ) : (
          log.map((l) => (
            <div key={l.id} className="log-entry">
              <div className="log-time">{l.label}</div>
              <div>{l.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
