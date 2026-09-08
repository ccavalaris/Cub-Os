"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adjustScoreAction,
  payPayoutAction,
  reversePayoutAction,
  setPayoutAmountAction,
  logFieldMessageAction,
  setPlayStatusAction,
  addRulingAction,
  touchSponsorAction,
} from "./actions";
import { SUB_TABS, type SubTab } from "./tabs";

type Tournament = {
  id: string;
  name: string;
  dateLabel: string;
  format: string;
  status: string;
  statusLabel: string;
  fieldSize: number;
};
type Summary = {
  teamCount: number;
  reportedCount: number;
  groupCount: number;
  startingHoles: number;
  caddiesAssigned: number;
  leader: string;
};
type Flight = { id: string; name: string };
type GroupTeam = { id: string; name: string; flightName: string; caddieName: string | null };
type Group = {
  id: string;
  startHole: number;
  startTime: string;
  wave: string;
  teams: GroupTeam[];
};
type Team = {
  id: string;
  name: string;
  flightId: string | null;
  flightName: string;
  thru: number;
  scoreToPar: number;
  reported: boolean;
  memberName: string | null;
};
type Payout = {
  id: string;
  flightName: string;
  place: string;
  teamName: string;
  memberName: string | null;
  amount: string;
  amountDollars: string;
  status: string;
};
type Message = { id: string; body: string; time: string; delivery: string };
type RulingRow = { id: string; hole: number; decision: string; official: string; time: string };
type StatusRow = { id: string; label: string; note: string; time: string };
type SponsorRow = {
  id: string;
  name: string;
  tier: string;
  contactName: string;
  note: string;
  lastContact: string;
};

const ORNAMENT = (
  <div className="ornament">
    <span />
    <i>&#10070;</i>
    <span className="right" />
  </div>
);

export default function TournamentBoard(props: {
  tab: SubTab;
  tournament: Tournament;
  summary: Summary;
  flights: Flight[];
  groups: Group[];
  teams: Team[];
  payouts: Payout[];
  messages: Message[];
  rulings: RulingRow[];
  statusLog: StatusRow[];
  sponsors: SponsorRow[];
}) {
  const { tab, tournament } = props;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    after?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setError(null);
        setFlash(res.message ?? null);
        after?.();
        router.refresh();
      } else {
        setFlash(null);
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  const badgeClass =
    tournament.status === "ACTIVE"
      ? "open"
      : tournament.status === "DELAYED"
        ? "booked"
        : tournament.status === "SUSPENDED"
          ? "blocked"
          : "booked";

  return (
    <div className="fade-wrap">
      <div className="tourney-header">
        <div>
          <div className="tourney-name">{tournament.name}</div>
          <div className="tourney-meta">
            {tournament.dateLabel}
            {tournament.fieldSize ? ` · ${tournament.fieldSize} players` : ""}
            {tournament.format ? ` · ${tournament.format}` : ""}
          </div>
        </div>
        <span className={`badge ${badgeClass}`}>{tournament.statusLabel}</span>
      </div>

      <div className="subnav">
        {SUB_TABS.map((s) => (
          <div
            key={s.id}
            className={`subnav-item ${tab === s.id ? "active" : ""}`}
            onClick={() => {
              setError(null);
              setFlash(null);
              router.push(`/tournament?tab=${s.id}`);
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      {error ? <div className="drawer-error">{error}</div> : null}
      {flash ? <div className="flash">{flash}</div> : null}

      {tab === "pairings" ? <Pairings {...props} /> : null}
      {tab === "flights" ? <Flights {...props} /> : null}
      {tab === "scoring" ? <Scoring {...props} run={run} pending={pending} /> : null}
      {tab === "payouts" ? <Payouts {...props} run={run} pending={pending} /> : null}
      {tab === "comms" ? <Comms {...props} run={run} pending={pending} /> : null}
      {tab === "weather" ? <Weather {...props} run={run} pending={pending} /> : null}
      {tab === "rulings" ? <Rulings {...props} run={run} pending={pending} /> : null}
      {tab === "sponsors" ? <Sponsors {...props} run={run} pending={pending} /> : null}
    </div>
  );
}

type Runner = (
  fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
  after?: () => void,
) => void;

function SummaryCells({ cells }: { cells: Array<[string, string]> }) {
  return (
    <div className="lesson-summary">
      {cells.map(([label, value]) => (
        <div key={label} className="lesson-sum-cell">
          <div className="lesson-sum-label">{label}</div>
          <div className="lesson-sum-value">{value}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- pairings */

function Pairings({ groups, summary }: { groups: Group[]; summary: Summary }) {
  return (
    <>
      <SummaryCells
        cells={[
          ["Field", String(summary.teamCount * 2)],
          ["Groups", String(summary.groupCount)],
          ["Starting Holes", String(summary.startingHoles)],
          ["Caddies Assigned", String(summary.caddiesAssigned)],
        ]}
      />
      <div className="section" style={{ marginTop: 26 }}>
        <div className="panel-title">Pairing Sheet</div>
        <div className="panel-desc">
          Every group in the draw, by starting hole and wave. Caddie names come from
          the tee sheet roster.
        </div>
        {ORNAMENT}
        {groups.length === 0 ? (
          <div className="mini-panel">
            <div className="mini-row">No groups drawn yet.</div>
          </div>
        ) : (
          <table className="inv">
            <thead>
              <tr>
                <th>Start</th>
                <th>Hole</th>
                <th>Wave</th>
                <th>Flight</th>
                <th>Teams</th>
                <th>Caddies</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td className="mono">{g.startTime}</td>
                  <td className="mono">{g.startHole}</td>
                  <td>
                    <span className="wave-tag">{g.wave}</span>
                  </td>
                  <td>
                    <span className="tag">{g.teams[0]?.flightName ?? "—"}</span>
                  </td>
                  <td>{g.teams.map((t) => t.name).join("  ·  ") || "—"}</td>
                  <td style={{ color: "var(--ink-soft)" }}>
                    {g.teams
                      .map((t) => t.caddieName)
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- flights */

function Flights({ flights, teams }: { flights: Flight[]; teams: Team[] }) {
  return (
    <div className="section">
      <div className="panel-title">Flights</div>
      <div className="panel-desc">Rosters as drawn, with each team&rsquo;s standing so far.</div>
      {ORNAMENT}
      {flights.length === 0 ? (
        <div className="mini-panel">
          <div className="mini-row">No flights set for this field.</div>
        </div>
      ) : (
        flights.map((f) => {
          const inFlight = teams.filter((t) => t.flightId === f.id);
          return (
            <div key={f.id} className="mini-panel flight-block">
              <div className="mini-panel-title">
                {f.name} · {inFlight.length} team{inFlight.length === 1 ? "" : "s"}
              </div>
              {inFlight.length === 0 ? (
                <div className="mini-row">No teams in this flight.</div>
              ) : (
                inFlight.map((t) => (
                  <div key={t.id} className="mini-row">
                    <span style={{ flex: 1 }}>{t.name}</span>
                    <span className="tag">
                      {t.reported ? `Thru ${t.thru}` : "Not reported"}
                    </span>
                    <span className={`lb-score ${scoreClass(t)}`}>{scoreLabel(t)}</span>
                  </div>
                ))
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function scoreLabel(t: Team): string {
  if (!t.reported) return "—";
  return t.scoreToPar === 0 ? "E" : t.scoreToPar > 0 ? `+${t.scoreToPar}` : String(t.scoreToPar);
}
function scoreClass(t: Team): string {
  if (!t.reported) return "";
  return t.scoreToPar < 0 ? "under" : t.scoreToPar > 0 ? "over" : "";
}

/* ----------------------------------------------------------------- scoring */

function Scoring({
  teams,
  summary,
  tournament,
  run,
  pending,
}: {
  teams: Team[];
  summary: Summary;
  tournament: Tournament;
  run: Runner;
  pending: boolean;
}) {
  const [flightFilter, setFlightFilter] = useState<string>("all");
  const flightNames = [...new Set(teams.map((t) => t.flightName))];

  // Reported teams rank low-to-high; teams still out on the course sit below.
  const ranked = [...teams].sort((a, b) => {
    if (a.reported !== b.reported) return a.reported ? -1 : 1;
    if (a.scoreToPar !== b.scoreToPar) return a.scoreToPar - b.scoreToPar;
    return a.name.localeCompare(b.name);
  });
  const visible =
    flightFilter === "all" ? ranked : ranked.filter((t) => t.flightName === flightFilter);

  // Golf position with ties, over reported teams only.
  const reportedRanked = ranked.filter((t) => t.reported);
  const position = new Map<string, string>();
  reportedRanked.forEach((t) => {
    const first = reportedRanked.findIndex((o) => o.scoreToPar === t.scoreToPar);
    const tied = reportedRanked.filter((o) => o.scoreToPar === t.scoreToPar).length > 1;
    position.set(t.id, `${tied ? "T" : ""}${first + 1}`);
  });

  return (
    <>
      <SummaryCells
        cells={[
          ["Leader", summary.leader],
          ["Teams Reported", `${summary.reportedCount} / ${summary.teamCount}`],
          ["Field", `${summary.teamCount * 2}`],
          ["Play Status", tournament.statusLabel],
        ]}
      />
      <div className="section" style={{ marginTop: 26 }}>
        <div className="panel-title">Live Leaderboard</div>
        <div className="panel-desc">
          Sorted low to high across all flights. Adjust thru-holes and score as teams
          report in from the course; the first adjustment marks a team reported.
        </div>

        <div className="instr-filter">
          <div
            className={`instr-pill ${flightFilter === "all" ? "active" : ""}`}
            onClick={() => setFlightFilter("all")}
          >
            All Flights
          </div>
          {flightNames.map((n) => (
            <div
              key={n}
              className={`instr-pill ${flightFilter === n ? "active" : ""}`}
              onClick={() => setFlightFilter(n)}
            >
              {n}
            </div>
          ))}
        </div>
        {ORNAMENT}

        <div className="mini-panel">
          <div className="flight-head">
            <span>Pos</span>
            <span>Team</span>
            <span>Thru</span>
            <span>Score</span>
            <span>Adjust</span>
          </div>
          {visible.length === 0 ? (
            <div className="mini-row">No teams in this flight.</div>
          ) : (
            visible.map((t) => (
              <div key={t.id} className={`lb-row ${t.reported ? "" : "unreported"}`}>
                <span className="lb-rank">{position.get(t.id) ?? "—"}</span>
                <span>
                  {t.name}{" "}
                  <span className="search-result-cat" style={{ marginLeft: 6 }}>
                    {t.flightName}
                  </span>
                </span>
                <span className="lb-controls">
                  <button
                    className="stepper-btn"
                    disabled={pending || t.thru === 0}
                    onClick={() => run(() => adjustScoreAction({ teamId: t.id, thruDelta: -1 }))}
                    aria-label={`${t.name} thru minus`}
                  >
                    &minus;
                  </button>
                  <span className="stock-num">{t.thru}</span>
                  <button
                    className="stepper-btn"
                    disabled={pending || t.thru === 18}
                    onClick={() => run(() => adjustScoreAction({ teamId: t.id, thruDelta: 1 }))}
                    aria-label={`${t.name} thru plus`}
                  >
                    &#43;
                  </button>
                </span>
                <span className={`lb-score ${scoreClass(t)}`}>{scoreLabel(t)}</span>
                <span className="lb-controls">
                  <button
                    className="stepper-btn"
                    disabled={pending}
                    onClick={() => run(() => adjustScoreAction({ teamId: t.id, scoreDelta: -1 }))}
                    aria-label={`${t.name} score minus`}
                  >
                    &minus;
                  </button>
                  <button
                    className="stepper-btn"
                    disabled={pending}
                    onClick={() => run(() => adjustScoreAction({ teamId: t.id, scoreDelta: 1 }))}
                    aria-label={`${t.name} score plus`}
                  >
                    &#43;
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- payouts */

function Payouts({ payouts, run, pending }: { payouts: Payout[]; run: Runner; pending: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="section">
      <div className="panel-title">Prize Payouts</div>
      <div className="panel-desc">
        Winnings by flight. Settling one posts shop credit to the winner&rsquo;s member
        account — it shows on the member directory like any other line, and can be
        reversed.
      </div>
      {ORNAMENT}
      {payouts.length === 0 ? (
        <div className="mini-panel">
          <div className="mini-row">No prize money set for this tournament.</div>
        </div>
      ) : (
        <table className="inv">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Place</th>
              <th>Winner</th>
              <th>Account</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{p.flightName}</td>
                <td className="mono">{p.place}</td>
                <td>{p.teamName}</td>
                <td style={{ color: "var(--ink-soft)" }}>{p.memberName ?? "no account"}</td>
                <td className="mono">
                  {editing === p.id ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={p.amountDollars}
                      autoFocus
                      style={{ width: 90, padding: "4px 6px", border: "1px solid var(--line)" }}
                      onBlur={(e) =>
                        run(
                          () => setPayoutAmountAction({ payoutId: p.id, amount: e.target.value }),
                          () => setEditing(null),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      title={p.status === "PAID" ? "Reverse to edit" : "Click to edit"}
                      onClick={() => p.status !== "PAID" && setEditing(p.id)}
                    >
                      {p.amount}
                    </span>
                  )}
                </td>
                <td>
                  {p.status === "PAID" ? (
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="badge open">Paid</span>
                      <button
                        className="btn ghost small"
                        disabled={pending}
                        onClick={() => run(() => reversePayoutAction(p.id))}
                      >
                        Reverse
                      </button>
                    </span>
                  ) : (
                    <button
                      className="pos-btn"
                      disabled={pending}
                      onClick={() => run(() => payPayoutAction(p.id))}
                    >
                      Settle
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- comms */

function Comms({
  tournament,
  messages,
  run,
  pending,
}: {
  tournament: Tournament;
  messages: Message[];
  run: Runner;
  pending: boolean;
}) {
  return (
    <div className="section">
      <div className="panel-title">Field Communications</div>
      <div className="panel-desc">
        The record of what the field was told, and when.
      </div>
      {ORNAMENT}

      <div className="not-live">
        <span className="nl-mark">Log only</span>
        <div>
          <div className="nl-title">Messages are recorded here, not texted to players.</div>
          <div className="nl-body">
            Sending to phones needs an SMS account and a number members recognise, which
            the club has not set up yet. Until then this keeps the timeline — useful on
            its own for the post-event debrief — and nothing here reaches anyone&rsquo;s phone.
          </div>
        </div>
      </div>

      <form
        className="comm-box"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          run(
            () =>
              logFieldMessageAction({
                tournamentId: tournament.id,
                body: String(fd.get("body") ?? ""),
              }),
            () => form.reset(),
          );
        }}
      >
        <textarea
          name="body"
          placeholder="e.g. Play is resuming on all holes — carts are back on the course."
          required
        />
        <button className="btn" type="submit" disabled={pending}>
          Record update
        </button>
      </form>

      <div className="log-list">
        {messages.length === 0 ? (
          <div className="log-item">Nothing recorded yet.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="log-item">
              <span className="log-item-time">{m.time}</span>
              {m.body}
              {m.delivery === "LOGGED_ONLY" ? (
                <span className="tag" style={{ marginLeft: 8 }}>
                  not sent
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- weather */

const PLAY_OPTIONS: Array<[string, string, string]> = [
  ["ACTIVE", "Active Play", "active-open"],
  ["DELAYED", "Weather Delay", "active-caution"],
  ["SUSPENDED", "Suspended", "active-closed"],
  ["COMPLETE", "Complete", "active-open"],
];

function Weather({
  tournament,
  statusLog,
  run,
  pending,
}: {
  tournament: Tournament;
  statusLog: StatusRow[];
  run: Runner;
  pending: boolean;
}) {
  return (
    <div className="section">
      <div className="panel-title">Play Status</div>
      <div className="panel-desc">
        Field-wide status for the day. Every change is logged below with the time it
        was made, which is what a committee wants when it reviews a delay afterwards.
      </div>
      {ORNAMENT}

      <div className="weather-banner-row">
        {PLAY_OPTIONS.map(([id, label, cls]) => (
          <div
            key={id}
            className={`weather-opt ${tournament.status === id ? `active ${cls}` : ""}`}
            onClick={() =>
              !pending &&
              tournament.status !== id &&
              run(() => setPlayStatusAction({ tournamentId: tournament.id, status: id as "ACTIVE", note: "" }))
            }
          >
            {label}
          </div>
        ))}
      </div>

      <div className="log-list">
        {statusLog.length === 0 ? (
          <div className="log-item">No status changes logged yet.</div>
        ) : (
          statusLog.map((s) => (
            <div key={s.id} className="log-item">
              <span className="log-item-time">{s.time}</span>
              <strong>{s.label}</strong> — {s.note}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- rulings */

function Rulings({
  tournament,
  rulings,
  run,
  pending,
}: {
  tournament: Tournament;
  rulings: RulingRow[];
  run: Runner;
  pending: boolean;
}) {
  return (
    <div className="section">
      <div className="panel-title">Rules Decisions</div>
      <div className="panel-desc">
        Log decisions as they happen, for the record and for pace-of-play review.
      </div>
      {ORNAMENT}

      <form
        className="comm-box"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          run(
            () =>
              addRulingAction({
                tournamentId: tournament.id,
                hole: Number.parseInt(String(fd.get("hole") ?? "0"), 10) || 0,
                decision: String(fd.get("decision") ?? ""),
                official: String(fd.get("official") ?? ""),
              }),
            () => form.reset(),
          );
        }}
      >
        <div className="ruling-form">
          <div className="field" style={{ maxWidth: 100 }}>
            <label htmlFor="hole">Hole</label>
            <input id="hole" name="hole" type="number" min={1} max={18} placeholder="7" required />
          </div>
          <div className="field" style={{ flex: 3 }}>
            <label htmlFor="decision">Decision</label>
            <input
              id="decision"
              name="decision"
              type="text"
              placeholder="Free relief from GUR left of the fairway, Rule 16.1."
              required
            />
          </div>
          <div className="field" style={{ maxWidth: 170 }}>
            <label htmlFor="official">Official</label>
            <input id="official" name="official" type="text" placeholder="Head Pro" required />
          </div>
          <button className="btn" type="submit" disabled={pending}>
            Log decision
          </button>
        </div>
      </form>

      <div className="log-list">
        {rulings.length === 0 ? (
          <div className="log-item">No decisions logged yet.</div>
        ) : (
          rulings.map((r) => (
            <div key={r.id} className="log-item">
              <span className="log-item-time">{r.time}</span>
              Hole {r.hole} — {r.decision}{" "}
              <span className="search-result-cat">{r.official}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- sponsors */

function Sponsors({
  sponsors,
  run,
  pending,
}: {
  sponsors: SponsorRow[];
  run: Runner;
  pending: boolean;
}) {
  return (
    <div className="section">
      <div className="panel-title">Sponsor Comms</div>
      <div className="panel-desc">
        Who is backing the event, what they were promised, and when they were last
        spoken to.
      </div>
      {ORNAMENT}
      {sponsors.length === 0 ? (
        <div className="mini-panel">
          <div className="mini-row">No sponsors on this event.</div>
        </div>
      ) : (
        sponsors.map((s) => (
          <div key={s.id} className="sponsor-card">
            <div>
              <div className="sponsor-name">{s.name}</div>
              <div className="sponsor-tier">{s.tier}</div>
              <div className="sponsor-meta">
                Contact: {s.contactName || "—"} · Last spoken to: {s.lastContact}
                <br />
                {s.note}
              </div>
            </div>
            <button
              className="btn ghost small sponsor-touch"
              disabled={pending}
              onClick={() => run(() => touchSponsorAction(s.id))}
            >
              Log contact today
            </button>
          </div>
        ))
      )}
    </div>
  );
}
