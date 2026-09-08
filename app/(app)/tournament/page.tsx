import { requireModule } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatCentsShort } from "@/lib/money";
import PageShell from "@/components/page-shell";
import TournamentBoard from "./tournament-board";
import { SUB_TABS, type SubTab } from "./tabs";

export const dynamic = "force-dynamic";

const PLAY_LABEL: Record<string, string> = {
  ACTIVE: "Active Play",
  DELAYED: "Weather Delay",
  SUSPENDED: "Suspended",
  COMPLETE: "Complete",
};

export default async function TournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireModule("tournament");
  const params = await searchParams;
  const tab: SubTab = SUB_TABS.some((t) => t.id === params.tab)
    ? (params.tab as SubTab)
    : "pairings";

  // The nearest tournament on or after today, else the most recent one.
  const tournament =
    (await prisma.tournament.findFirst({
      where: { clubId: user.clubId, date: { gte: startOfToday() } },
      orderBy: { date: "asc" },
    })) ??
    (await prisma.tournament.findFirst({
      where: { clubId: user.clubId },
      orderBy: { date: "desc" },
    }));

  if (!tournament) {
    return (
      <PageShell clubId={user.clubId} title="Tournament Ops" subtitle="No tournament on the books">
        <div className="fade-wrap">
          <div className="section">
            <div className="panel-title">Nothing scheduled</div>
            <div className="panel-desc">
              Tournament operations open up once an event of type Tournament is on the
              calendar with a field drawn.
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const [flights, groups, teams, payouts, messages, rulings, statusLog, sponsors] =
    await Promise.all([
      prisma.flight.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { sortKey: "asc" },
      }),
      prisma.teeGroup.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { sortKey: "asc" },
        include: {
          teams: { include: { flight: true, caddie: true }, orderBy: { name: "asc" } },
        },
      }),
      prisma.tournamentTeam.findMany({
        where: { tournamentId: tournament.id },
        include: { flight: true, member: true },
        orderBy: [{ scoreToPar: "asc" }, { name: "asc" }],
      }),
      prisma.payout.findMany({
        where: { tournamentId: tournament.id },
        include: { flight: true, team: { include: { member: true } } },
        orderBy: [{ flightId: "asc" }, { place: "asc" }],
      }),
      prisma.fieldMessage.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.ruling.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { loggedAt: "desc" },
        take: 20,
      }),
      prisma.playStatusEntry.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { loggedAt: "desc" },
        take: 20,
      }),
      prisma.sponsor.findMany({
        where: { tournamentId: tournament.id },
        orderBy: { name: "asc" },
      }),
    ]);

  const reported = teams.filter((t) => t.reported);
  const leader = reported.length
    ? [...reported].sort((a, b) => a.scoreToPar - b.scoreToPar)[0]
    : null;

  const clock = (d: Date) =>
    `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${
      d.getHours() >= 12 ? "pm" : "am"
    }`;

  return (
    <PageShell
      clubId={user.clubId}
      title="Tournament Ops"
      subtitle={`${tournament.name} — ${reported.length} of ${teams.length} team${
        teams.length === 1 ? "" : "s"
      } reported`}
    >
      <TournamentBoard
        tab={tab}
        tournament={{
          id: tournament.id,
          name: tournament.name,
          dateLabel: tournament.date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          }),
          format: tournament.format,
          status: tournament.status,
          statusLabel: PLAY_LABEL[tournament.status] ?? tournament.status,
          fieldSize: tournament.fieldSize,
        }}
        summary={{
          teamCount: teams.length,
          reportedCount: reported.length,
          groupCount: groups.length,
          startingHoles: new Set(groups.map((g) => g.startHole)).size,
          caddiesAssigned: groups.reduce(
            (n, g) => n + g.teams.filter((t) => t.caddieId).length,
            0,
          ),
          leader: leader?.name ?? "—",
        }}
        flights={flights.map((f) => ({ id: f.id, name: f.name }))}
        groups={groups.map((g) => ({
          id: g.id,
          startHole: g.startHole,
          startTime: g.startTime,
          wave: g.wave,
          teams: g.teams.map((t) => ({
            id: t.id,
            name: t.name,
            flightName: t.flight?.name ?? "—",
            caddieName: t.caddie?.name ?? null,
          })),
        }))}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          flightId: t.flightId,
          flightName: t.flight?.name ?? "—",
          thru: t.thru,
          scoreToPar: t.scoreToPar,
          reported: t.reported,
          memberName: t.member?.household ?? null,
        }))}
        payouts={payouts.map((p) => ({
          id: p.id,
          flightName: p.flight?.name ?? "Overall",
          place: p.place,
          teamName: p.team?.name ?? "—",
          memberName: p.team?.member?.household ?? null,
          amount: formatCentsShort(p.amountCents),
          amountDollars: (p.amountCents / 100).toString(),
          status: p.status,
        }))}
        messages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          time: clock(m.createdAt),
          delivery: m.delivery,
        }))}
        rulings={rulings.map((r) => ({
          id: r.id,
          hole: r.hole,
          decision: r.decision,
          official: r.official,
          time: clock(r.loggedAt),
        }))}
        statusLog={statusLog.map((s) => ({
          id: s.id,
          label: PLAY_LABEL[s.status] ?? s.status,
          note: s.note,
          time: clock(s.loggedAt),
        }))}
        sponsors={sponsors.map((s) => ({
          id: s.id,
          name: s.name,
          tier: s.tier,
          contactName: s.contactName,
          note: s.note,
          lastContact: s.lastContactAt
            ? s.lastContactAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "never",
        }))}
      />
    </PageShell>
  );
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
