import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentCourse } from "@/lib/course";
import { isOpen, isOverdue } from "@/lib/derive";
import { daysOut, daysOutLabel, formatDate } from "@/lib/dates";
import { Card, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PLANNING: "Planning",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETE: "Complete",
} as const;

export default async function EventsPage() {
  const course = await currentCourse();
  const events = await prisma.event.findMany({
    where: { courseId: course.id },
    include: { tasks: true, participants: true },
    orderBy: { date: "asc" },
  });

  const upcoming = events.filter((e) => daysOut(e.date) >= 0);
  const past = events.filter((e) => daysOut(e.date) < 0);

  return (
    <>
      <h1 className="mb-1 text-[22px] font-semibold tracking-tight">Events</h1>
      <p className="mb-5 text-[13px] text-muted">
        {upcoming.length} upcoming
        {past.length > 0 && `, ${past.length} past`}
      </p>

      {events.length === 0 ? (
        <Empty>No events yet.</Empty>
      ) : (
        <div className="space-y-2.5">
          {[...upcoming, ...past].map((e) => {
            const open = e.tasks.filter(isOpen);
            const late = e.tasks.filter(isOverdue);
            const total = e.tasks.length;
            const done = total - open.length;
            const out = daysOut(e.date);

            return (
              <Card key={e.id} className="transition-colors hover:border-faint">
                <Link href={`/events/${e.id}`} className="block px-3.5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[15px] font-medium">{e.name}</h2>
                    <span
                      className={`shrink-0 text-[12px] tnum ${
                        out >= 0 && out <= 7 ? "text-warn" : "text-muted"
                      }`}
                    >
                      {formatDate(e.date)} · {daysOutLabel(e.date)}
                    </span>
                  </div>

                  {e.description && (
                    <p className="mt-1 text-[13px] leading-snug text-muted">{e.description}</p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                    <span className="rounded-full border border-line px-2 py-0.5">
                      {STATUS_LABEL[e.status]}
                    </span>
                    <span className="tnum">
                      {done}/{total} tasks done
                    </span>
                    <span className="tnum">
                      {e.participants.length}{" "}
                      {e.participants.length === 1 ? "participant" : "participants"}
                    </span>
                    {late.length > 0 && (
                      <span className="font-medium text-alert tnum">
                        {late.length} overdue
                      </span>
                    )}
                  </div>

                  {total > 0 && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-line-soft">
                      <div
                        className="h-full rounded-full bg-accent transition-[width]"
                        style={{ width: `${Math.round((done / total) * 100)}%` }}
                      />
                    </div>
                  )}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
