"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";

const saveSchema = z.object({
  slotId: z.string().min(1),
  status: z.enum(["OPEN", "BOOKED", "BLOCKED"]),
  groupName: z.string().max(120).default(""),
  memberId: z.string().nullable().default(null),
  mode: z.enum(["CART", "WALKING"]).nullable().default(null),
  caddieId: z.string().nullable().default(null),
  note: z.string().max(240).default(""),
});

export type SaveSlotInput = z.input<typeof saveSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveSlotAction(input: SaveSlotInput): Promise<ActionResult> {
  const user = await assertModule("tee");
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That booking wasn't valid." };
  const data = parsed.data;

  const slot = await prisma.teeSlot.findFirst({
    where: { id: data.slotId, clubId: user.clubId },
  });
  if (!slot) return { ok: false, error: "That tee time no longer exists." };

  // A booked slot needs someone on it, otherwise the sheet shows a booking
  // with no name against it and the starter has nothing to call.
  if (data.status === "BOOKED" && !data.groupName.trim() && !data.memberId) {
    return { ok: false, error: "Add a player group or pick a member to book this time." };
  }

  if (data.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: data.memberId, clubId: user.clubId },
    });
    if (!member) return { ok: false, error: "That member isn't on file." };
  }

  if (data.caddieId) {
    const caddie = await prisma.caddie.findFirst({
      where: { id: data.caddieId, clubId: user.clubId },
    });
    if (!caddie) return { ok: false, error: "That caddie isn't on the roster." };

    // One caddie, one loop at a time. Catch the double-booking here rather
    // than letting two groups turn up expecting the same looper.
    const clash = await prisma.teeSlot.findFirst({
      where: {
        clubId: user.clubId,
        date: slot.date,
        caddieId: data.caddieId,
        status: "BOOKED",
        id: { not: slot.id },
      },
    });
    if (clash) {
      return {
        ok: false,
        error: `${caddie.name} is already on the ${clash.teeTime} loop.`,
      };
    }
  }

  const clearing = data.status !== "BOOKED";

  await prisma.$transaction(async (tx) => {
    await tx.teeSlot.update({
      where: { id: slot.id },
      data: {
        status: data.status,
        groupName: clearing && data.status === "OPEN" ? "" : data.groupName.trim(),
        memberId: clearing ? null : data.memberId,
        mode: clearing ? null : data.mode,
        caddieId: clearing ? null : data.caddieId,
        note: data.note.trim(),
      },
    });

    // Keep the caddie board honest: assigning a loop puts the caddie on it.
    if (!clearing && data.caddieId) {
      await tx.caddie.update({
        where: { id: data.caddieId },
        data: { status: "ON_LOOP" },
      });
    }
    if (slot.caddieId && slot.caddieId !== data.caddieId) {
      const stillOut = await tx.teeSlot.count({
        where: {
          clubId: user.clubId,
          date: slot.date,
          caddieId: slot.caddieId,
          status: "BOOKED",
          id: { not: slot.id },
        },
      });
      if (stillOut === 0) {
        await tx.caddie.updateMany({
          where: { id: slot.caddieId, clubId: user.clubId, status: "ON_LOOP" },
          data: { status: "AVAILABLE" },
        });
      }
    }
  });

  revalidatePath("/tee");
  revalidatePath("/caddie");
  revalidatePath("/");
  return { ok: true };
}
