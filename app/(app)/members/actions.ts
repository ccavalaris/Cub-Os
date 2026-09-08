"use server";

import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";
import { monthStart } from "@/lib/charges";
import { formatCents } from "@/lib/money";

export type LedgerLine = {
  id: string;
  postedAt: string;
  source: string;
  description: string;
  amount: string;
};

const SOURCE_LABELS: Record<string, string> = {
  PRO_SHOP: "Pro Shop",
  HALFWAY_HOUSE: "Halfway House",
  LESSON: "Lesson",
  MANUAL: "Manual",
};

/** The transactions behind a household's month-to-date number. */
export async function memberLedgerAction(memberId: string): Promise<LedgerLine[]> {
  const user = await assertModule("members");

  const charges = await prisma.memberCharge.findMany({
    // clubId in the filter, not just memberId — a guessed id from another club
    // returns nothing rather than another club's ledger.
    where: { clubId: user.clubId, memberId, postedAt: { gte: monthStart() } },
    orderBy: { postedAt: "desc" },
    take: 50,
  });

  return charges.map((c) => ({
    id: c.id,
    postedAt: `${c.postedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} ${c.postedAt.getHours() % 12 || 12}:${String(c.postedAt.getMinutes()).padStart(2, "0")}${
      c.postedAt.getHours() >= 12 ? "pm" : "am"
    }`,
    source: SOURCE_LABELS[c.source] ?? c.source,
    description: c.description,
    amount: formatCents(c.amountCents),
  }));
}
