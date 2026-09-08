import { prisma } from "@/lib/prisma";
import { dayKeyToDbDate, minutesToLabel, type DayKey } from "@/lib/dates";

/** Teaching day: 8:00am to 4:00pm in one-hour blocks, per instructor. */
export const LESSON_START_MINUTES = 8 * 60;
export const LESSON_INTERVAL_MINUTES = 60;
export const LESSON_SLOT_COUNT = 8;

export const LESSON_TYPES = [
  "Full Swing",
  "Short Game",
  "Putting",
  "Playing Lesson — 9 Holes",
  "Club Fitting",
  "Junior Group",
];

/** Same idea as the tee sheet: materialise a day's book once, then it persists. */
export async function ensureLessonDay(clubId: string, day: DayKey): Promise<void> {
  const date = dayKeyToDbDate(day);
  const instructors = await prisma.instructor.findMany({
    where: { clubId, active: true },
    select: { id: true },
  });
  if (instructors.length === 0) return;

  const expected = instructors.length * LESSON_SLOT_COUNT;
  const existing = await prisma.lesson.count({ where: { clubId, date } });
  if (existing >= expected) return;

  const rows = instructors.flatMap((instructor) =>
    Array.from({ length: LESSON_SLOT_COUNT }, (_, i) => {
      const sortKey = LESSON_START_MINUTES + i * LESSON_INTERVAL_MINUTES;
      return {
        clubId,
        date,
        instructorId: instructor.id,
        sortKey,
        startTime: minutesToLabel(sortKey),
        status: "OPEN" as const,
      };
    }),
  );

  await prisma.lesson.createMany({ data: rows, skipDuplicates: true });
}
