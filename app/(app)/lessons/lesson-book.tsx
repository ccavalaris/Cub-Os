"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { shiftDayKey, todayKey } from "@/lib/dates";
import {
  saveLessonAction,
  chargeLessonAction,
  reverseLessonChargeAction,
} from "./actions";

type Lesson = {
  id: string;
  startTime: string;
  instructorId: string;
  instructorName: string;
  status: "OPEN" | "BOOKED" | "BLOCKED";
  memberId: string | null;
  memberName: string | null;
  guestName: string;
  lessonType: string;
  minutes: number;
  rate: string;
  rateDollars: string;
  charged: boolean;
};

type Instructor = { id: string; name: string };
type Member = { id: string; household: string };

export default function LessonBook({
  day,
  isToday,
  dayLabel,
  activeInstructor,
  summary,
  lessons,
  instructors,
  members,
  lessonTypes,
}: {
  day: string;
  isToday: boolean;
  dayLabel: string;
  activeInstructor: string;
  summary: { booked: number; revenue: string; openSlots: number; notCharged: number };
  lessons: Lesson[];
  instructors: Instructor[];
  members: Member[];
  lessonTypes: string[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = lessons.find((l) => l.id === openId) ?? null;
  const visible =
    activeInstructor === "all"
      ? lessons
      : lessons.filter((l) => l.instructorId === activeInstructor);

  function navigate(nextDay: string, instructor: string) {
    setOpenId(null);
    setError(null);
    setFlash(null);
    const q = new URLSearchParams({ date: nextDay });
    if (instructor !== "all") q.set("instructor", instructor);
    router.push(`/lessons?${q.toString()}`);
  }

  function save(form: HTMLFormElement) {
    if (!open) return;
    const fd = new FormData(form);
    const memberId = String(fd.get("memberId") ?? "");
    startTransition(async () => {
      const res = await saveLessonAction({
        lessonId: open.id,
        status: String(fd.get("status")) as Lesson["status"],
        memberId: memberId || null,
        guestName: String(fd.get("guestName") ?? ""),
        lessonType: String(fd.get("lessonType") ?? ""),
        minutes: Number.parseInt(String(fd.get("minutes") ?? "0"), 10) || 0,
        rate: String(fd.get("rate") ?? ""),
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

  function charge() {
    if (!open) return;
    startTransition(async () => {
      const res = await chargeLessonAction(open.id);
      if (res.ok) {
        setOpenId(null);
        setError(null);
        setFlash(res.message ?? null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function reverse() {
    if (!open) return;
    startTransition(async () => {
      const res = await reverseLessonChargeAction(open.id);
      if (res.ok) {
        setOpenId(null);
        setError(null);
        setFlash(res.message ?? null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="fade-wrap">
      <div className="section">
        <div className="panel-title">Lesson Book</div>
        <div className="panel-desc">
          The teaching schedule across all instructors. Click any slot to book a
          student, set the lesson type and rate, or block time out. Booked lessons
          can be charged straight to a member&rsquo;s account.
        </div>

        <div className="lesson-summary">
          <div className="lesson-sum-cell">
            <div className="lesson-sum-label">Lessons Booked</div>
            <div className="lesson-sum-value">{summary.booked}</div>
          </div>
          <div className="lesson-sum-cell">
            <div className="lesson-sum-label">Instruction Revenue</div>
            <div className="lesson-sum-value">{summary.revenue}</div>
          </div>
          <div className="lesson-sum-cell">
            <div className="lesson-sum-label">Open Slots</div>
            <div className="lesson-sum-value">{summary.openSlots}</div>
          </div>
          <div className="lesson-sum-cell">
            <div className="lesson-sum-label">Not Yet Charged</div>
            <div className="lesson-sum-value">{summary.notCharged}</div>
          </div>
        </div>

        <div className="day-switcher">
          <button
            className="btn ghost small"
            onClick={() => navigate(shiftDayKey(day, -1), activeInstructor)}
          >
            &larr; Prev
          </button>
          <span className="day-label">{dayLabel}</span>
          <button
            className="btn ghost small"
            onClick={() => navigate(shiftDayKey(day, 1), activeInstructor)}
          >
            Next &rarr;
          </button>
          {!isToday ? (
            <button className="btn small" onClick={() => navigate(todayKey(), activeInstructor)}>
              Back to Today
            </button>
          ) : null}
        </div>

        <div className="instr-filter">
          <div
            className={`instr-pill ${activeInstructor === "all" ? "active" : ""}`}
            onClick={() => navigate(day, "all")}
          >
            All Instructors
          </div>
          {instructors.map((i) => (
            <div
              key={i.id}
              className={`instr-pill ${activeInstructor === i.id ? "active" : ""}`}
              onClick={() => navigate(day, i.id)}
            >
              {i.name}
            </div>
          ))}
        </div>

        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        {flash ? <div className="flash">{flash}</div> : null}

        <div className="ledger">
          {visible.length === 0 ? (
            <div className="mini-row">No lessons for this instructor today.</div>
          ) : (
            visible.map((l) => {
              const student = l.memberName || l.guestName;
              return (
                <div
                  key={l.id}
                  className={`lesson-row ${l.status === "OPEN" ? "is-open" : ""} ${
                    openId === l.id ? "row-open" : ""
                  }`}
                  onClick={() => {
                    setError(null);
                    setOpenId(openId === l.id ? null : l.id);
                  }}
                >
                  <div className="lesson-time">{l.startTime}</div>
                  <div className="lesson-instructor">{l.instructorName}</div>
                  <div className={`lesson-student ${!student ? "empty" : ""}`}>
                    {student ||
                      (l.status === "BLOCKED" ? "Blocked — not bookable" : "Open — available")}
                    {l.charged ? <span className="tag" style={{ marginLeft: 8 }}>charged</span> : null}
                  </div>
                  <div>{l.lessonType ? <span className="tag">{l.lessonType}</span> : null}</div>
                  <div className={`lesson-rate ${l.rate === "—" ? "zero" : ""}`}>{l.rate}</div>
                  <div>
                    <span className={`badge ${l.status.toLowerCase()}`}>
                      {l.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
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
              <div className="field" style={{ flex: 1.4 }}>
                <label htmlFor="memberId">Student (member)</label>
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
                <label htmlFor="guestName">or Guest / Other</label>
                <input
                  id="guestName"
                  name="guestName"
                  type="text"
                  defaultValue={open.guestName}
                  placeholder="e.g. Junior Clinic (6)"
                />
              </div>
              <div className="field">
                <label htmlFor="lessonType">Lesson Type</label>
                <select id="lessonType" name="lessonType" defaultValue={open.lessonType}>
                  <option value="">— none —</option>
                  {lessonTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ maxWidth: 110 }}>
                <label htmlFor="minutes">Minutes</label>
                <input
                  id="minutes"
                  name="minutes"
                  type="number"
                  min={0}
                  step={15}
                  defaultValue={open.minutes || ""}
                  placeholder="60"
                />
              </div>
              <div className="field" style={{ maxWidth: 110 }}>
                <label htmlFor="rate">Rate ($)</label>
                <input
                  id="rate"
                  name="rate"
                  type="text"
                  inputMode="decimal"
                  defaultValue={open.rateDollars}
                  placeholder="140"
                />
              </div>
              <div className="field" style={{ maxWidth: 130 }}>
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={open.status}>
                  <option value="OPEN">Open</option>
                  <option value="BOOKED">Booked</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            </div>

            {error ? <div className="drawer-error">{error}</div> : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" type="submit" disabled={pending}>
                {pending ? "Saving…" : `Save ${open.startTime} lesson`}
              </button>
              {open.status === "BOOKED" && !open.charged && open.memberId ? (
                <button className="btn ghost" type="button" onClick={charge} disabled={pending}>
                  Charge to Member Account
                </button>
              ) : null}
              {open.charged ? (
                <>
                  <span className="badge open" style={{ alignSelf: "center" }}>
                    Charged to account
                  </span>
                  <button className="btn danger" type="button" onClick={reverse} disabled={pending}>
                    Reverse charge
                  </button>
                </>
              ) : null}
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
