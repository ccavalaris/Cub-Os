"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";
import { parseDollarsToCents, formatCents } from "@/lib/money";

export type LessonResult = { ok: true; message?: string } | { ok: false; error: string };

const saveSchema = z.object({
  lessonId: z.string().min(1),
  status: z.enum(["OPEN", "BOOKED", "BLOCKED"]),
  memberId: z.string().nullable(),
  guestName: z.string().max(120),
  lessonType: z.string().max(80),
  minutes: z.number().int().min(0).max(600),
  rate: z.string().max(20),
});

export async function saveLessonAction(
  input: z.input<typeof saveSchema>,
): Promise<LessonResult> {
  const user = await assertModule("lessons");
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That lesson wasn't valid." };
  const data = parsed.data;

  const lesson = await prisma.lesson.findFirst({
    where: { id: data.lessonId, clubId: user.clubId },
  });
  if (!lesson) return { ok: false, error: "That lesson slot no longer exists." };

  if (data.status === "BOOKED" && !data.memberId && !data.guestName.trim()) {
    return { ok: false, error: "Pick a member or enter a student name to book this slot." };
  }

  if (data.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: data.memberId, clubId: user.clubId },
    });
    if (!member) return { ok: false, error: "That member isn't on file." };
  }

  // A lesson already charged to an account is a posted transaction. Reopening
  // the slot would orphan that charge, so require the reversal first.
  if (lesson.charged && data.status !== "BOOKED") {
    return {
      ok: false,
      error: "This lesson is charged to an account. Reverse the charge before changing it.",
    };
  }

  const rateCents = parseDollarsToCents(data.rate);
  if (rateCents < 0) return { ok: false, error: "Rate can't be negative." };

  const clearing = data.status !== "BOOKED";

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      status: data.status,
      memberId: clearing ? null : data.memberId,
      guestName: clearing ? "" : data.guestName.trim(),
      lessonType: clearing ? "" : data.lessonType,
      minutes: clearing ? 0 : data.minutes,
      rateCents: clearing ? 0 : rateCents,
    },
  });

  revalidatePath("/lessons");
  revalidatePath("/");
  return { ok: true };
}

/** Post a booked lesson to the student's member account. */
export async function chargeLessonAction(lessonId: string): Promise<LessonResult> {
  const user = await assertModule("lessons");

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, clubId: user.clubId },
    include: { member: true, instructor: true },
  });
  if (!lesson) return { ok: false, error: "That lesson no longer exists." };
  if (lesson.status !== "BOOKED") return { ok: false, error: "Only a booked lesson can be charged." };
  if (lesson.charged) return { ok: false, error: "This lesson is already charged." };
  if (!lesson.memberId || !lesson.member) {
    return { ok: false, error: "This student isn't a member — take payment at the shop." };
  }
  if (lesson.rateCents <= 0) return { ok: false, error: "Set a rate before charging." };

  const member = lesson.member;

  await prisma.$transaction(async (tx) => {
    // `charged` guards the write: if a second click gets here first, this
    // update matches nothing and the charge is not written twice.
    const claimed = await tx.lesson.updateMany({
      where: { id: lesson.id, charged: false },
      data: { charged: true },
    });
    if (claimed.count === 0) return;

    await tx.memberCharge.create({
      data: {
        clubId: user.clubId,
        memberId: member.id,
        source: "LESSON",
        description: `${lesson.lessonType || "Lesson"} with ${lesson.instructor.name}${
          lesson.minutes ? ` (${lesson.minutes} min)` : ""
        }`,
        amountCents: lesson.rateCents,
        postedById: user.id,
        lessonId: lesson.id,
      },
    });
    await tx.member.update({
      where: { id: member.id },
      data: { lastVisit: new Date() },
    });
  });

  revalidatePath("/lessons");
  revalidatePath("/members");
  revalidatePath("/");
  return {
    ok: true,
    message: `${formatCents(lesson.rateCents)} charged to ${member.household}.`,
  };
}

/** Undo a mistaken charge — reverses the ledger row rather than deleting it. */
export async function reverseLessonChargeAction(lessonId: string): Promise<LessonResult> {
  const user = await assertModule("lessons");

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, clubId: user.clubId },
    include: { charge: true, member: true },
  });
  if (!lesson) return { ok: false, error: "That lesson no longer exists." };
  if (!lesson.charged || !lesson.charge) {
    return { ok: false, error: "This lesson hasn't been charged." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.memberCharge.delete({ where: { id: lesson.charge!.id } });
    await tx.lesson.update({ where: { id: lesson.id }, data: { charged: false } });
  });

  revalidatePath("/lessons");
  revalidatePath("/members");
  revalidatePath("/");
  return { ok: true, message: "Charge reversed." };
}
