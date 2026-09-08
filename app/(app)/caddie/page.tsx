import { requireModule } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dayKeyToDbDate, todayKey } from "@/lib/dates";
import PageShell from "@/components/page-shell";
import CaddieRoster from "./caddie-roster";

export const dynamic = "force-dynamic";

export default async function CaddiePage() {
  const user = await requireModule("caddie");
  const today = dayKeyToDbDate(todayKey());

  const [caddies, todaysLoops] = await Promise.all([
    prisma.caddie.findMany({
      where: { clubId: user.clubId },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.teeSlot.findMany({
      where: {
        clubId: user.clubId,
        date: today,
        status: "BOOKED",
        caddieId: { not: null },
      },
      orderBy: { sortKey: "asc" },
      include: { member: true },
    }),
  ]);

  // Assignments come off the real tee sheet, not a free-text field.
  const loopsByCaddie = new Map<string, { teeTime: string; group: string }[]>();
  for (const slot of todaysLoops) {
    if (!slot.caddieId) continue;
    const list = loopsByCaddie.get(slot.caddieId) ?? [];
    list.push({
      teeTime: slot.teeTime,
      group: slot.groupName || slot.member?.household || "Booked group",
    });
    loopsByCaddie.set(slot.caddieId, list);
  }

  const onLoop = caddies.filter((c) => c.status === "ON_LOOP").length;

  return (
    <PageShell
      clubId={user.clubId}
      title="Caddie Program"
      subtitle={`${onLoop} on loop · ${caddies.length} in the program today`}
    >
      <CaddieRoster
        caddies={caddies.map((c) => ({
          id: c.id,
          name: c.name,
          tier: c.tier,
          status: c.status,
          loops: loopsByCaddie.get(c.id) ?? [],
        }))}
      />
    </PageShell>
  );
}
