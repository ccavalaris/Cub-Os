"use server";

import { revalidatePath } from "next/cache";
import type { InteractionSource, Priority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { courseState } from "@/lib/course";
import { extractFromNote, type ExtractionResult } from "@/lib/extract";
import { ask, type Answer } from "@/lib/ask";

/// Extraction is a two-step flow on purpose: `previewNote` reads the note and
/// proposes records but writes nothing, and `commitNote` saves what the user
/// approved. The Head Pro always sees — and can correct — what the machine
/// understood before it lands in the database.

/// Actions run behind a rendered page, so by the time one fires a course must
/// exist — its absence is a bug rather than the pre-seed state the pages show.
async function requireCourse() {
  const state = await courseState();
  if (state.status !== "ok") throw new Error("No course found. Load the demo data first.");
  return state.course;
}

export async function previewNote(note: string): Promise<ExtractionResult> {
  const course = await requireCourse();
  const [members, events] = await Promise.all([
    prisma.member.findMany({ where: { courseId: course.id }, select: { name: true } }),
    prisma.event.findMany({
      where: { courseId: course.id },
      select: { name: true, date: true },
    }),
  ]);
  return extractFromNote(note, { members, events });
}

export type CommitPayload = {
  note: string;
  memberNames: string[];
  eventName: string | null;
  topic: string;
  source: InteractionSource;
  needsResponse: boolean;
  tasks: { title: string; priority: Priority; dueDate: string | null }[];
};

export async function commitNote(payload: CommitPayload): Promise<{ taskCount: number }> {
  const course = await requireCourse();
  const courseId = course.id;

  // The raw note is stored first and everything else points back at it, so a
  // task can always be traced to the sentence it came from.
  const context = await prisma.context.create({
    data: {
      courseId,
      type: "note",
      content: payload.note,
      metadata: {
        topic: payload.topic,
        eventName: payload.eventName,
        memberNames: payload.memberNames,
      },
    },
  });

  const memberIds: string[] = [];
  for (const rawName of payload.memberNames) {
    const name = rawName.trim();
    if (!name) continue;
    const existing = await prisma.member.findFirst({
      where: { courseId, name: { equals: name, mode: "insensitive" } },
    });
    const member = existing ?? (await prisma.member.create({ data: { courseId, name } }));
    memberIds.push(member.id);
  }

  const event = payload.eventName
    ? await prisma.event.findFirst({
        where: { courseId, name: { equals: payload.eventName.trim(), mode: "insensitive" } },
      })
    : null;

  // One interaction per member named, so the note shows up on each of their
  // profiles rather than only the first one mentioned. Only the first-named
  // member carries "awaiting reply" though: in "John called… playing with
  // Mike", John is the one who asked for something — flagging Mike too would
  // put a follow-up on the dashboard that nobody actually owes him.
  if (memberIds.length > 0) {
    for (const [index, memberId] of memberIds.entries()) {
      await prisma.interaction.create({
        data: {
          courseId,
          memberId,
          content: payload.note,
          source: payload.source,
          needsResponse: payload.needsResponse && index === 0,
          sourceContextId: context.id,
        },
      });
    }
  } else {
    await prisma.interaction.create({
      data: {
        courseId,
        content: payload.note,
        source: payload.source,
        needsResponse: payload.needsResponse,
        sourceContextId: context.id,
      },
    });
  }

  const tasks = payload.tasks.filter((t) => t.title.trim().length > 0);
  for (const t of tasks) {
    await prisma.task.create({
      data: {
        courseId,
        title: t.title.trim(),
        priority: t.priority,
        dueDate: t.dueDate ? new Date(`${t.dueDate}T12:00:00`) : null,
        memberId: memberIds[0] ?? null,
        eventId: event?.id ?? null,
        sourceContextId: context.id,
      },
    });
  }

  if (memberIds.length > 0 && event) {
    for (const memberId of memberIds) {
      await prisma.eventParticipant.upsert({
        where: { eventId_memberId: { eventId: event.id, memberId } },
        create: { eventId: event.id, memberId },
        update: {},
      });
    }
  }

  revalidatePath("/", "layout");
  return { taskCount: tasks.length };
}

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  revalidatePath("/", "layout");
}

export async function markResponded(interactionId: string): Promise<void> {
  await prisma.interaction.update({
    where: { id: interactionId },
    data: { needsResponse: false },
  });
  revalidatePath("/", "layout");
}

export async function askCourse(question: string): Promise<Answer> {
  const course = await requireCourse();
  return ask(course.id, question);
}
