"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";

export type EventResult = { ok: true } | { ok: false; error: string };

/** Confirm the task belongs to a club the caller can act on. */
async function ownedTask(clubId: string, taskId: string) {
  return prisma.eventTask.findFirst({
    where: { id: taskId, event: { clubId } },
    include: { event: true },
  });
}

export async function toggleTaskAction(taskId: string): Promise<EventResult> {
  const user = await assertModule("events");
  const task = await ownedTask(user.clubId, taskId);
  if (!task) return { ok: false, error: "That task no longer exists." };

  await prisma.eventTask.update({
    where: { id: task.id },
    data: { done: !task.done },
  });

  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true };
}

const ownerSchema = z.object({
  taskId: z.string().min(1),
  ownerId: z.string().nullable(),
});

export async function setTaskOwnerAction(
  input: z.input<typeof ownerSchema>,
): Promise<EventResult> {
  const user = await assertModule("events");
  const parsed = ownerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That owner wasn't valid." };

  const task = await ownedTask(user.clubId, parsed.data.taskId);
  if (!task) return { ok: false, error: "That task no longer exists." };

  if (parsed.data.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: parsed.data.ownerId, clubId: user.clubId },
    });
    if (!owner) return { ok: false, error: "That staff member isn't at this club." };
  }

  await prisma.eventTask.update({
    where: { id: task.id },
    data: { ownerId: parsed.data.ownerId },
  });

  revalidatePath("/events");
  return { ok: true };
}

const addSchema = z.object({
  eventId: z.string().min(1),
  label: z.string().trim().min(1).max(160),
  ownerId: z.string().nullable(),
});

export async function addTaskAction(
  input: z.input<typeof addSchema>,
): Promise<EventResult> {
  const user = await assertModule("events");
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a task before adding it." };

  const event = await prisma.event.findFirst({
    where: { id: parsed.data.eventId, clubId: user.clubId },
  });
  if (!event) return { ok: false, error: "That event no longer exists." };

  const last = await prisma.eventTask.findFirst({
    where: { eventId: event.id },
    orderBy: { sortKey: "desc" },
  });

  await prisma.eventTask.create({
    data: {
      eventId: event.id,
      label: parsed.data.label,
      ownerId: parsed.data.ownerId,
      sortKey: (last?.sortKey ?? 0) + 10,
    },
  });

  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<EventResult> {
  const user = await assertModule("events");
  const task = await ownedTask(user.clubId, taskId);
  if (!task) return { ok: false, error: "That task no longer exists." };

  await prisma.eventTask.delete({ where: { id: task.id } });

  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true };
}
