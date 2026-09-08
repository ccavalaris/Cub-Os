import { requireModule } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureLessonDay, LESSON_TYPES } from "@/lib/lesson-book";
import { dayKeyToDbDate, isValidDayKey, longDayLabel, todayKey } from "@/lib/dates";
import { formatCentsShort } from "@/lib/money";
import PageShell from "@/components/page-shell";
import LessonBook from "./lesson-book";

export const dynamic = "force-dynamic";

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; instructor?: string }>;
}) {
  const user = await requireModule("lessons");
  const params = await searchParams;
  const day = isValidDayKey(params.date) ? params.date : todayKey();

  await ensureLessonDay(user.clubId, day);

  const [lessons, instructors, members] = await Promise.all([
    prisma.lesson.findMany({
      where: { clubId: user.clubId, date: dayKeyToDbDate(day) },
      orderBy: [{ sortKey: "asc" }, { instructorId: "asc" }],
      include: { instructor: true, member: true },
    }),
    prisma.instructor.findMany({
      where: { clubId: user.clubId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where: { clubId: user.clubId, status: { not: "RESIGNED" } },
      orderBy: { household: "asc" },
      select: { id: true, household: true },
    }),
  ]);

  const booked = lessons.filter((l) => l.status === "BOOKED");
  const openSlots = lessons.filter((l) => l.status === "OPEN").length;
  const revenueCents = booked.reduce((sum, l) => sum + l.rateCents, 0);
  const notCharged = booked.filter((l) => !l.charged && l.memberId).length;

  return (
    <PageShell
      clubId={user.clubId}
      title="Lesson Book"
      subtitle={`${longDayLabel(day)} — ${booked.length} lesson${
        booked.length === 1 ? "" : "s"
      } booked · ${openSlots} slot${openSlots === 1 ? "" : "s"} still open`}
    >
      <LessonBook
        day={day}
        isToday={day === todayKey()}
        dayLabel={longDayLabel(day)}
        activeInstructor={params.instructor ?? "all"}
        summary={{
          booked: booked.length,
          revenue: formatCentsShort(revenueCents),
          openSlots,
          notCharged,
        }}
        lessons={lessons.map((l) => ({
          id: l.id,
          startTime: l.startTime,
          instructorId: l.instructorId,
          instructorName: l.instructor.name,
          status: l.status,
          memberId: l.memberId,
          memberName: l.member?.household ?? null,
          guestName: l.guestName,
          lessonType: l.lessonType,
          minutes: l.minutes,
          rate: l.rateCents ? formatCentsShort(l.rateCents) : "—",
          rateDollars: l.rateCents ? (l.rateCents / 100).toString() : "",
          charged: l.charged,
        }))}
        instructors={instructors.map((i) => ({ id: i.id, name: i.name }))}
        members={members}
        lessonTypes={LESSON_TYPES}
      />
    </PageShell>
  );
}
