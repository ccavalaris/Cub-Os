import { prisma } from "@/lib/prisma";

export function monthStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Month-to-date balance per member, summed from the ledger rather than read off
 * a counter. Returns a Map of memberId -> cents; members with no charges this
 * month are simply absent.
 */
export async function mtdChargesByMember(
  clubId: string,
  from: Date = monthStart(),
): Promise<Map<string, number>> {
  const rows = await prisma.memberCharge.groupBy({
    by: ["memberId"],
    where: { clubId, postedAt: { gte: from } },
    _sum: { amountCents: true },
  });
  return new Map(rows.map((r) => [r.memberId, r._sum.amountCents ?? 0]));
}

export async function mtdChargesFor(
  clubId: string,
  memberId: string,
  from: Date = monthStart(),
): Promise<number> {
  const agg = await prisma.memberCharge.aggregate({
    where: { clubId, memberId, postedAt: { gte: from } },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}
