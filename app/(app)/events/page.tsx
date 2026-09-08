import { requireModule } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { daysOutLabel, needsAttention, daysOut } from "@/lib/events";
import PageShell from "@/components/page-shell";
import EventBoard from "./event-board";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  TOURNAMENT: "Tournament",
  PRIVATE_FUNCTION: "Private function",
  MEMBER_EVENT: "Member event",
};

export default async function EventsPage() {
  const user = await requireModule("events");

  const [events, staff] = await Promise.all([
    prisma.event.findMany({
      where: { clubId: user.clubId },
      orderBy: { date: "asc" },
      include: {
        tasks: { orderBy: { sortKey: "asc" }, include: { owner: true } },
        tournament: { select: { id: true } },
      },
    }),
    prisma.user.findMany({
      where: { clubId: user.clubId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = events.map((ev) => {
    const open = ev.tasks.filter((t) => !t.done).length;
    return {
      id: ev.id,
      name: ev.name,
      kindLabel: KIND_LABEL[ev.kind] ?? ev.kind,
      dateLabel: ev.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      detail: ev.detail,
      location: ev.location,
      daysOutLabel: daysOutLabel(ev.date),
      daysOut: daysOut(ev.date),
      needsAttention: needsAttention(ev.date, open),
      tournamentId: ev.tournament?.id ?? null,
      tasks: ev.tasks.map((t) => ({
        id: t.id,
        label: t.label,
        done: t.done,
        ownerId: t.ownerId,
        ownerInitials: t.owner ? initials(t.owner.name) : null,
        ownerName: t.owner?.name ?? null,
      })),
    };
  });

  const attention = rows.filter((r) => r.needsAttention).length;

  return (
    <PageShell
      clubId={user.clubId}
      title="Event Logistics"
      subtitle={`${events.length} event${events.length === 1 ? "" : "s"} on the books · ${
        attention === 0 ? "none need attention this week" : `${attention} need${attention === 1 ? "s" : ""} attention this week`
      }`}
    >
      <EventBoard events={rows} staff={staff} />
    </PageShell>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
