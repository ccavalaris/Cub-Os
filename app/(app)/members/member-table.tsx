"use client";

import { useState, useTransition } from "react";
import { memberLedgerAction, type LedgerLine } from "./actions";

type Row = {
  id: string;
  household: string;
  membershipType: string;
  familySize: number;
  status: string;
  dues: string;
  handicap: string | null;
  mtd: string;
  lastVisit: string;
};

const DUES_CLASS: Record<string, string> = {
  CURRENT: "open",
  GRACE_PERIOD: "booked",
  PAST_DUE: "blocked",
};
const DUES_LABEL: Record<string, string> = {
  CURRENT: "Current",
  GRACE_PERIOD: "Grace Period",
  PAST_DUE: "Past Due",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  RESIGNED: "Resigned",
};

export default function MemberTable({ rows }: { rows: Row[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerLine[] | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      setLedger(null);
      return;
    }
    setOpenId(id);
    setLedger(null);
    startTransition(async () => setLedger(await memberLedgerAction(id)));
  }

  const open = rows.find((r) => r.id === openId);

  return (
    <>
      <table className="inv">
        <thead>
          <tr>
            <th>Household</th>
            <th>Type</th>
            <th>Family</th>
            <th>Status</th>
            <th>Dues</th>
            <th>Handicap</th>
            <th>MTD Charges</th>
            <th>Last Visit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr
              key={m.id}
              onClick={() => toggle(m.id)}
              className={openId === m.id ? "row-open" : ""}
              style={{ cursor: "pointer" }}
            >
              <td>{m.household}</td>
              <td>{m.membershipType}</td>
              <td>{m.familySize}</td>
              <td>{STATUS_LABEL[m.status] ?? m.status}</td>
              <td>
                <span className={`badge ${DUES_CLASS[m.dues] ?? "open"}`}>
                  {DUES_LABEL[m.dues] ?? m.dues}
                </span>
              </td>
              <td className="mono">{m.handicap ?? "—"}</td>
              <td className="mono">{m.mtd}</td>
              <td>{m.lastVisit}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>
                No households on file yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {open ? (
        <div className="drawer show">
          <div className="drawer-title">
            {open.household} — charges this month
          </div>
          {pending && ledger === null ? (
            <div className="drawer-empty">Loading…</div>
          ) : ledger && ledger.length > 0 ? (
            <div className="mini-panel" style={{ marginTop: 12 }}>
              {ledger.map((l) => (
                <div key={l.id} className="mini-row">
                  <span className="mini-time" style={{ width: 110 }}>
                    {l.postedAt}
                  </span>
                  <span style={{ flex: 1 }}>
                    {l.description} <span className="tag">{l.source}</span>
                  </span>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {l.amount}
                  </span>
                </div>
              ))}
              <div className="mini-row" style={{ background: "#F7F2E7" }}>
                <span style={{ flex: 1, fontWeight: 600 }}>Month to date</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {open.mtd}
                </span>
              </div>
            </div>
          ) : (
            <div className="drawer-empty">
              No charges posted to this account this month.
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="btn ghost" onClick={() => toggle(open.id)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
