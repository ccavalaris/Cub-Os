"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";
import { dayKeyToDbDate, todayKey } from "@/lib/dates";

export type CourseResult = { ok: true } | { ok: false; error: string };

const COURSE_NOTES: Record<string, string> = {
  OPEN: "Greens rolling true. No restrictions in effect.",
  RESTRICTED: "Restricted play in effect — see hole notes below.",
  CLOSED: "Course closed to all play until further notice.",
};

const statusSchema = z.enum(["OPEN", "RESTRICTED", "CLOSED"]);

export async function setCourseStatusAction(status: string): Promise<CourseResult> {
  const user = await assertModule("course");
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "That status wasn't valid." };

  const date = dayKeyToDbDate(todayKey());
  await prisma.courseDay.upsert({
    where: { clubId_date: { clubId: user.clubId, date } },
    create: {
      clubId: user.clubId,
      date,
      status: parsed.data,
      note: COURSE_NOTES[parsed.data],
    },
    update: { status: parsed.data, note: COURSE_NOTES[parsed.data] },
  });

  // The status pill is on every screen, so every screen is now stale.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleHoleAction(holeId: string): Promise<CourseResult> {
  const user = await assertModule("course");

  const hole = await prisma.hole.findFirst({
    where: { id: holeId, clubId: user.clubId },
  });
  if (!hole) return { ok: false, error: "That hole isn't on the card." };

  const next = hole.status === "OPEN" ? "CART_PATH_ONLY" : "OPEN";
  await prisma.hole.update({
    where: { id: hole.id },
    data: {
      status: next,
      note:
        next === "CART_PATH_ONLY"
          ? "Cart path only — marked by grounds crew."
          : "Normal play. No restrictions.",
    },
  });

  revalidatePath("/course");
  revalidatePath("/");
  return { ok: true };
}

const pinSchema = z.object({
  holeId: z.string().min(1),
  pin: z.enum(["A", "B", "C"]),
});

export async function setPinAction(input: z.input<typeof pinSchema>): Promise<CourseResult> {
  const user = await assertModule("course");
  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That pin position wasn't valid." };

  const updated = await prisma.hole.updateMany({
    where: { id: parsed.data.holeId, clubId: user.clubId },
    data: { pin: parsed.data.pin },
  });
  if (updated.count === 0) return { ok: false, error: "That hole isn't on the card." };

  revalidatePath("/course");
  return { ok: true };
}

const logSchema = z.object({
  label: z.string().min(1).max(24),
  text: z.string().min(1).max(400),
});

export async function addMaintLogAction(
  input: z.input<typeof logSchema>,
): Promise<CourseResult> {
  const user = await assertModule("course");
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Add a time label and a note before saving." };
  }

  await prisma.maintLogEntry.create({
    data: {
      clubId: user.clubId,
      label: parsed.data.label.trim(),
      text: parsed.data.text.trim(),
    },
  });

  revalidatePath("/course");
  return { ok: true };
}
