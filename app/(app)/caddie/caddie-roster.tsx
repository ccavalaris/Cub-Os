"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCaddieStatusAction } from "./actions";

type Loop = { teeTime: string; group: string };
type Caddie = {
  id: string;
  name: string;
  tier: string;
  status: "AVAILABLE" | "ON_LOOP" | "OFF_TODAY";
  loops: Loop[];
};

const CYCLE: Record<Caddie["status"], Caddie["status"]> = {
  AVAILABLE: "ON_LOOP",
  ON_LOOP: "OFF_TODAY",
  OFF_TODAY: "AVAILABLE",
};

const BADGE: Record<Caddie["status"], { cls: string; label: string }> = {
  AVAILABLE: { cls: "open", label: "Available" },
  ON_LOOP: { cls: "booked", label: "On Loop" },
  OFF_TODAY: { cls: "blocked", label: "Off Today" },
};

const TIER_LABEL: Record<string, string> = {
  LOOPER: "Looper",
  STANDARD: "Standard",
  TOURNAMENT: "Tournament",
};

export default function CaddieRoster({ caddies }: { caddies: Caddie[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cycle(c: Caddie) {
    startTransition(async () => {
      const res = await setCaddieStatusAction({
        caddieId: c.id,
        status: CYCLE[c.status],
      });
      if (res.ok) {
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
        <div className="panel-title">Today&rsquo;s Roster</div>
        <div className="panel-desc">
          Click a status badge to cycle availability. Assignments are read from
          today&rsquo;s tee sheet — assign a caddie to a tee time there and it shows up
          here automatically.
        </div>
        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        {error ? <div className="drawer-error" style={{ marginBottom: 14 }}>{error}</div> : null}

        <div className="caddie-grid">
          {caddies.map((c) => {
            const badge = BADGE[c.status];
            return (
              <div key={c.id} className="caddie-card">
                <div className="caddie-top">
                  <div>
                    <div className="caddie-name">{c.name}</div>
                    <div className="caddie-tier">{TIER_LABEL[c.tier] ?? c.tier}</div>
                  </div>
                  <span
                    className={`badge ${badge.cls} status-toggle`}
                    onClick={() => !pending && cycle(c)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") cycle(c);
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="caddie-meta">
                  {c.loops.length === 0 ? (
                    <>Assignment: &mdash;</>
                  ) : (
                    c.loops.map((l, i) => (
                      <div key={i}>
                        {l.group} &mdash; {l.teeTime}
                      </div>
                    ))
                  )}
                  <div style={{ marginTop: 4 }}>Loops today: {c.loops.length}</div>
                </div>
              </div>
            );
          })}
          {caddies.length === 0 ? (
            <div className="mini-row">No caddies on the roster yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
