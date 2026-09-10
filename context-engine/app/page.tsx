import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { courseState } from "@/lib/course";
import { attentionItems, isDueThisWeek, isDueToday, isOpen, isOverdue } from "@/lib/derive";
import { daysOut, daysOutLabel, formatDate, formatLongDate, isToday, isWithinWeek, today } from "@/lib/dates";
import { toTaskRow } from "@/lib/rows";
import { Card, Empty, Section, Stat } from "@/components/ui";
import { TaskRow } from "@/components/task-row";
import { ContextInbox } from "@/components/context-inbox";

export const dynamic = "force-dynamic";

export default async function CommandCenter() {
  const state = await courseState();
  if (state.status !== "ok") return null; // the layout renders the setup screen
  const course = state.course;
  const courseId = course.id;

  const [tasks, events, interactions] = await Promise.all([
    prisma.task.findMany({
      where: { courseId },
      include: { event: true, member: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.event.findMany({
      where: { courseId },
      include: { tasks: true, participants: true },
      orderBy: { date: "asc" },
    }),
    prisma.interaction.findMany({
      where: { courseId },
      include: { member: true },
      orderBy: { date: "desc" },
      take: 40,
    }),
  ]);

  const attention = attentionItems({ tasks, events, interactions });

  const openTasks = tasks.filter(isOpen);
  const overdue = tasks.filter(isOverdue);
  const dueToday = tasks.filter(isDueToday);
  const eventsToday = events.filter((e) => isToday(e.date));
  const eventsThisWeek = events.filter((e) => isWithinWeek(e.date) && !isToday(e.date));
  const dueThisWeek = tasks.filter((t) => isDueThisWeek(t) && !isDueToday(t));
  const waiting = interactions.filter(
    (i) => i.needsResponse && i.member && daysOut(i.date) >= -21,
  );

  return (
    <>
      <div className="mb-6 pt-2">
        <p className="label text-faint">{formatLongDate(today())}</p>
        <h1 className="display mt-1.5 text-[34px] leading-[1.1]">Command Center</h1>
      </div>

      <div className="mb-7">
        <ContextInbox />
      </div>

      <div className="mb-10 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4">
        <Stat value={overdue.length} label="Overdue" href="/tasks?filter=overdue" tone="alert" />
        <Stat value={openTasks.length} label="Open tasks" href="/tasks" />
        <Stat value={eventsToday.length + eventsThisWeek.length} label="Events this week" href="/events" />
        <Stat value={waiting.length} label="Awaiting reply" href="/members" />
      </div>

      <Section title="Attention needed" hint={attention.length ? `${attention.length}` : undefined}>
        {attention.length === 0 ? (
          <Empty>Nothing is overdue and no event in the next two weeks has open items.</Empty>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {attention.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex gap-3.5 py-3.5 transition-colors hover:bg-sunken/60"
                >
                  <span
                    aria-hidden
                    className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${
                      item.severity === "high" ? "bg-alert" : "bg-warn"
                    }`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`display block text-[19px] leading-tight ${
                        item.severity === "high" ? "text-alert" : "text-ink"
                      }`}
                    >
                      {item.headline}
                    </span>
                    <span className="mt-1 block text-[13.5px] leading-snug text-muted">
                      {item.detail}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Today">
        <div className="space-y-2.5">
          {eventsToday.length > 0 && (
            <Card>
              <ul className="divide-y divide-line-soft">
                {eventsToday.map((e) => (
                  <li key={e.id} className="px-3.5 py-2.5">
                    <Link href={`/events/${e.id}`} className="group">
                      <p className="text-[14px] font-medium group-hover:underline">{e.name}</p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {e.participants.length}{" "}
                        {e.participants.length === 1 ? "participant" : "participants"} ·{" "}
                        {e.tasks.filter(isOpen).length} open
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {dueToday.length > 0 ? (
            <Card>
              <ul className="divide-y divide-line-soft">
                {dueToday.map((t) => (
                  <TaskRow key={t.id} task={toTaskRow(t)} />
                ))}
              </ul>
            </Card>
          ) : (
            eventsToday.length === 0 && <Empty>Nothing due today.</Empty>
          )}

          {waiting.length > 0 && (
            <Card>
              <p className="label border-b border-line-soft px-3.5 py-2.5 text-muted">
                Member follow-ups
              </p>
              <ul className="divide-y divide-line-soft">
                {waiting.slice(0, 5).map((i) => (
                  <li key={i.id} className="px-3.5 py-2.5">
                    <Link href={`/members/${i.member!.id}`} className="group">
                      <p className="text-[14px] font-medium group-hover:underline">
                        {i.member!.name}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-snug text-muted">{i.content}</p>
                      <p className="mt-0.5 text-[12px] text-faint tnum">
                        {daysOutLabel(i.date)} · {i.source.toLowerCase().replace("_", " ")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </Section>

      <Section title="This week">
        <div className="space-y-2.5">
          {eventsThisWeek.length > 0 && (
            <Card>
              <ul className="divide-y divide-line-soft">
                {eventsThisWeek.map((e) => (
                  <li key={e.id} className="px-3.5 py-2.5">
                    <Link href={`/events/${e.id}`} className="group flex items-baseline justify-between gap-3">
                      <span>
                        <span className="text-[14px] font-medium group-hover:underline">
                          {e.name}
                        </span>
                        <span className="ml-2 text-[12px] text-muted">
                          {e.tasks.filter(isOpen).length} open
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] text-muted tnum">
                        {formatDate(e.date)} · {daysOutLabel(e.date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {dueThisWeek.length > 0 ? (
            <Card>
              <ul className="divide-y divide-line-soft">
                {dueThisWeek.map((t) => (
                  <TaskRow key={t.id} task={toTaskRow(t)} />
                ))}
              </ul>
            </Card>
          ) : (
            eventsThisWeek.length === 0 && <Empty>Nothing else scheduled this week.</Empty>
          )}
        </div>
      </Section>
    </>
  );
}
