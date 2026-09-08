"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { shiftDayKey, todayKey } from "@/lib/dates";
import { saveSlotAction } from "./actions";

type Slot = {
  id: string;
  teeTime: string;
  sortKey: number;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  groupName: string;
  memberId: string | null;
  memberName: string | null;
  mode: "CART" | "WALKING" | null;
  caddieId: string | null;
  caddieName: string | null;
  note: string;
};

type Caddie = { id: string; name: string; status: string };
type Member = { id: string; household: string };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "open",
  BOOKED: "booked",
  BLOCKED: "blocked",
};

export default function TeeSheet({
  day,
  isToday,
  dayLabel,
  slots,
  caddies,
  members,
}: {
  day: string;
  isToday: boolean;
  dayLabel: string;
  slots: Slot[];
  caddies: Caddie[];
  members: Member[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = slots.find((s) => s.id === openId) ?? null;

  function go(nextDay: string) {
    setOpenId(null);
    setError(null);
    router.push(`/tee?date=${nextDay}`);
  }

  function save(form: HTMLFormElement) {
    if (!open) return;
    const fd = new FormData(form);
    const status = String(fd.get("status")) as Slot["status"];
    const memberId = String(fd.get("memberId") ?? "");
    const caddieId = String(fd.get("caddieId") ?? "");
    const mode = String(fd.get("mode") ?? "");

    startTransition(async () => {
      const res = await saveSlotAction({
        slotId: open.id,
        status,
        groupName: String(fd.get("groupName") ?? ""),
        memberId: memberId || null,
        mode: mode ? (mode as "CART" | "WALKING") : null,
        caddieId: caddieId || null,
        note: String(fd.get("note") ?? ""),
      });
      if (res.ok) {
        setOpenId(null);
        setError(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="fade-wrap">
      <div className="section">
        <div className="panel-title">
          {isToday ? "Today's Tee Sheet" : "Tee Sheet"}
        </div>
        <div className="panel-desc">
          Click any slot to book, edit, or assign a caddie. Every day is live — page
          back and forward and bookings stay put.
        </div>

        <div className="day-switcher">
          <button className="btn ghost small" onClick={() => go(shiftDayKey(day, -1))}>
            &larr; Prev
          </button>
          <span className="day-label">{dayLabel}</span>
          <button className="btn ghost small" onClick={() => go(shiftDayKey(day, 1))}>
            Next &rarr;
          </button>
          {!isToday ? (
            <button className="btn small" onClick={() => go(todayKey())}>
              Back to Today
            </button>
          ) : null}
        </div>

        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        <div className="ledger">
          {slots.map((s) => {
            const hourMark = s.sortKey % 60 === 0;
            const label = s.groupName || s.memberName || "";
            return (
              <div
                key={s.id}
                className={`ledger-row ${hourMark ? "hour-mark" : ""} ${
                  openId === s.id ? "row-open" : ""
                }`}
                onClick={() => {
                  setError(null);
                  setOpenId(openId === s.id ? null : s.id);
                }}
              >
                <div className="ledger-time">{s.teeTime}</div>
                <div className={`ledger-group ${!label ? "empty" : ""}`}>
                  {label ||
                    (s.status === "BLOCKED" ? "Blocked — not bookable" : "Open — available")}
                </div>
                <div>
                  {s.mode ? (
                    <span className="tag">{s.mode === "CART" ? "Cart" : "Walking"}</span>
                  ) : null}
                </div>
                <div>
                  {s.caddieName ? <span className="tag caddie">{s.caddieName}</span> : null}
                </div>
                <div>
                  <span className={`badge ${STATUS_LABEL[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {open ? (
          <form
            className="drawer show"
            onSubmit={(e) => {
              e.preventDefault();
              save(e.currentTarget);
            }}
          >
            <div className="drawer-row">
              <div className="field" style={{ flex: 1.6 }}>
                <label htmlFor="groupName">Player Group</label>
                <input
                  id="groupName"
                  name="groupName"
                  type="text"
                  defaultValue={open.groupName}
                  placeholder="e.g. Whitfield / Sorensen"
                />
              </div>
              <div className="field" style={{ flex: 1.4 }}>
                <label htmlFor="memberId">Charge Account</label>
                <select id="memberId" name="memberId" defaultValue={open.memberId ?? ""}>
                  <option value="">— none —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.household}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="mode">Mode</label>
                <select id="mode" name="mode" defaultValue={open.mode ?? ""}>
                  <option value="">—</option>
                  <option value="CART">Cart</option>
                  <option value="WALKING">Walking</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="caddieId">Caddie</label>
                <select id="caddieId" name="caddieId" defaultValue={open.caddieId ?? ""}>
                  <option value="">— none —</option>
                  {caddies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={open.status}>
                  <option value="OPEN">Open</option>
                  <option value="BOOKED">Booked</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            </div>
            <div className="drawer-row">
              <div className="field">
                <label htmlFor="note">Note</label>
                <input
                  id="note"
                  name="note"
                  type="text"
                  defaultValue={open.note}
                  placeholder="e.g. maintenance window, guest of member"
                />
              </div>
            </div>

            {error ? <div className="drawer-error">{error}</div> : null}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" type="submit" disabled={pending}>
                {pending ? "Saving…" : `Save ${open.teeTime} slot`}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setOpenId(null);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
