"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";

export type CaddieResult = { ok: true } | { ok: false; error: string };

const statusSchema = z.object({
  caddieId: z.string().min(1),
  status: z.enum(["AVAILABLE", "ON_LOOP", "OFF_TODAY"]),
});

export async function setCaddieStatusAction(
  input: z.input<typeof statusSchema>,
): Promise<CaddieResult> {
  const user = await assertModule("caddie");
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That status wasn't valid." };
  const { caddieId, status } = parsed.data;

  const caddie = await prisma.caddie.findFirst({
    where: { id: caddieId, clubId: user.clubId },
  });
  if (!caddie) return { ok: false, error: "That caddie isn't on the roster." };

  // Don't let someone be marked off while the tee sheet still has them on a
  // loop — the starter would send out a group expecting a caddie who left.
  if (status !== "ON_LOOP") {
    const assigned = await prisma.teeSlot.findFirst({
      where: {
        clubId: user.clubId,
        caddieId,
        status: "BOOKED",
        date: { gte: startOfToday() },
      },
      orderBy: { sortKey: "asc" },
    });
    if (assigned) {
      return {
        ok: false,
        error: `${caddie.name} is assigned to the ${assigned.teeTime} loop — clear that first.`,
      };
    }
  }

  await prisma.caddie.update({ where: { id: caddie.id }, data: { status } });

  revalidatePath("/caddie");
  revalidatePath("/tee");
  revalidatePath("/");
  return { ok: true };
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
