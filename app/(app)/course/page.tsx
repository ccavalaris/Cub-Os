import { requireModule } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { dayKeyToDbDate, todayKey } from "@/lib/dates";
import PageShell from "@/components/page-shell";
import CourseBoard from "./course-board";

export const dynamic = "force-dynamic";

export default async function CoursePage() {
  const user = await requireModule("course");

  const [holes, courseDay, log] = await Promise.all([
    prisma.hole.findMany({
      where: { clubId: user.clubId },
      orderBy: { number: "asc" },
    }),
    prisma.courseDay.findUnique({
      where: { clubId_date: { clubId: user.clubId, date: dayKeyToDbDate(todayKey()) } },
    }),
    prisma.maintLogEntry.findMany({
      where: { clubId: user.clubId },
      orderBy: { loggedAt: "desc" },
      take: 15,
    }),
  ]);

  const cartPathCount = holes.filter((h) => h.status === "CART_PATH_ONLY").length;

  return (
    <PageShell
      clubId={user.clubId}
      title="Course Conditions"
      subtitle="Superintendent updates — hole status, pins, and the grounds log"
    >
      <CourseBoard
        status={courseDay?.status ?? "OPEN"}
        note={courseDay?.note ?? "Greens rolling true. No restrictions in effect."}
        cartPathCount={cartPathCount}
        holes={holes.map((h) => ({
          id: h.id,
          number: h.number,
          par: h.par,
          yards: h.yards,
          status: h.status,
          pin: h.pin,
          note: h.note,
        }))}
        log={log.map((l) => ({ id: l.id, label: l.label, text: l.text }))}
      />
    </PageShell>
  );
}
