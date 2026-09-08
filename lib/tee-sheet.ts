import { prisma } from "@/lib/prisma";
import { dayKeyToDbDate, minutesToLabel, type DayKey } from "@/lib/dates";

/** Club tee-sheet shape. A real deployment would make these club settings. */
export const TEE_START_MINUTES = 7 * 60; // 7:00am
export const TEE_INTERVAL_MINUTES = 10;
export const TEE_SLOT_COUNT = 48; // 7:00am through 3:50pm

/**
 * The prototype only had "today"; every other day was a synthetic preview that
 * couldn't be booked. Here each date gets its real grid the first time someone
 * opens it, and from then on it holds whatever was booked. Idempotent, so two
 * staff opening the same new day at once can't double-create it.
 */
export async function ensureDayGrid(clubId: string, day: DayKey): Promise<void> {
  const date = dayKeyToDbDate(day);

  const existing = await prisma.teeSlot.count({ where: { clubId, date } });
  if (existing >= TEE_SLOT_COUNT) return;

  const rows = Array.from({ length: TEE_SLOT_COUNT }, (_, i) => {
    const sortKey = TEE_START_MINUTES + i * TEE_INTERVAL_MINUTES;
    return {
      clubId,
      date,
      sortKey,
      teeTime: minutesToLabel(sortKey),
      status: "OPEN" as const,
    };
  });

  await prisma.teeSlot.createMany({ data: rows, skipDuplicates: true });
}
