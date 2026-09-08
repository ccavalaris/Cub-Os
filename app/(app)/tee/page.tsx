import { requireModule } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureDayGrid } from "@/lib/tee-sheet";
import {
  dayKeyToDbDate,
  isValidDayKey,
  longDayLabel,
  todayKey,
  type DayKey,
} from "@/lib/dates";
import PageShell from "@/components/page-shell";
import TeeSheet from "./tee-sheet";

export const dynamic = "force-dynamic";

export default async function TeePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireModule("tee");
  const params = await searchParams;
  const day: DayKey = isValidDayKey(params.date) ? params.date : todayKey();

  await ensureDayGrid(user.clubId, day);

  const [slots, caddies, members] = await Promise.all([
    prisma.teeSlot.findMany({
      where: { clubId: user.clubId, date: dayKeyToDbDate(day) },
      orderBy: { sortKey: "asc" },
      include: { caddie: true, member: true },
    }),
    prisma.caddie.findMany({
      where: { clubId: user.clubId, status: { not: "OFF_TODAY" } },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where: { clubId: user.clubId, status: { not: "RESIGNED" } },
      orderBy: { household: "asc" },
      select: { id: true, household: true },
    }),
  ]);

  const booked = slots.filter((s) => s.status === "BOOKED").length;

  return (
    <PageShell
      clubId={user.clubId}
      title="Tee Sheet"
      subtitle={`${longDayLabel(day)} — ${booked} of ${slots.length} slots booked`}
    >
      <TeeSheet
        day={day}
        isToday={day === todayKey()}
        dayLabel={longDayLabel(day)}
        slots={slots.map((s) => ({
          id: s.id,
          teeTime: s.teeTime,
          sortKey: s.sortKey,
          status: s.status,
          groupName: s.groupName,
          memberId: s.memberId,
          memberName: s.member?.household ?? null,
          mode: s.mode,
          caddieId: s.caddieId,
          caddieName: s.caddie?.name ?? null,
          note: s.note,
        }))}
        caddies={caddies.map((c) => ({ id: c.id, name: c.name, status: c.status }))}
        members={members}
      />
    </PageShell>
  );
}
