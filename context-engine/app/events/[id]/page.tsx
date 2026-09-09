import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCourse } from "@/lib/course";
import { isOpen } from "@/lib/derive";
import { toTaskRow } from "@/lib/rows";
import { daysOutLabel, formatDate } from "@/lib/dates";
import { Card, Empty, Section } from "@/components/ui";
import { TaskRow } from "@/components/task-row";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PLANNING: "Planning",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETE: "Complete",
} as const;

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await currentCourse();

  const event = await prisma.event.findFirst({
    where: { id, courseId: course.id },
    include: {
      tasks: { include: { member: true, event: true }, orderBy: [{ dueDate: "asc" }] },
      participants: { include: { member: true } },
    },
  });

  if (!event) notFound();

  const open = event.tasks.filter(isOpen);
  const done = event.tasks.filter((t) => !isOpen(t));

  // Notes mentioning anyone playing in this event — the "recent member notes"
  // an event summary should surface without anyone tagging them by hand.
  const memberIds = event.participants.map((p) => p.memberId);
  const notes = memberIds.length
    ? await prisma.interaction.findMany({
        where: { courseId: course.id, memberId: { in: memberIds } },
        include: { member: true },
        orderBy: { date: "desc" },
        take: 6,
      })
    : [];

  return (
    <>
      <Link href="/events" className="text-[13px] text-muted hover:text-ink">
        ← Events
      </Link>

      <h1 className="mt-2 text-[22px] font-semibold tracking-tight">{event.name}</h1>
      <p className="mt-0.5 text-[13px] text-muted tnum">
        {formatDate(event.date)} · {daysOutLabel(event.date)} ·{" "}
        <span className="text-ink">{STATUS_LABEL[event.status]}</span>
      </p>
      {event.description && (
        <p className="mb-6 mt-2 text-[14px] leading-relaxed text-muted">{event.description}</p>
      )}
      {!event.description && <div className="mb-6" />}

      <div className="mb-8 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
          <div className="tnum text-[28px] font-semibold leading-none">{open.length}</div>
          <div className="mt-1.5 text-[12px] text-muted">Open items</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
          <div className="tnum text-[28px] font-semibold leading-none">{done.length}</div>
          <div className="mt-1.5 text-[12px] text-muted">Done</div>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
          <div className="tnum text-[28px] font-semibold leading-none">
            {event.participants.length}
          </div>
          <div className="mt-1.5 text-[12px] text-muted">
            {event.participants.length === 1 ? "Participant" : "Participants"}
          </div>
        </div>
      </div>

      <Section title="Open items" hint={open.length ? `${open.length}` : undefined}>
        {open.length === 0 ? (
          <Empty>Everything on this event is done.</Empty>
        ) : (
          <Card>
            <ul className="divide-y divide-line-soft">
              {open.map((t) => (
                <TaskRow key={t.id} task={toTaskRow(t)} />
              ))}
            </ul>
          </Card>
        )}
      </Section>

      {done.length > 0 && (
        <Section title="Completed" hint={`${done.length}`}>
          <Card>
            <ul className="divide-y divide-line-soft">
              {done.map((t) => (
                <TaskRow key={t.id} task={toTaskRow(t)} />
              ))}
            </ul>
          </Card>
        </Section>
      )}

      <Section title="Participants" hint={`${event.participants.length}`}>
        {event.participants.length === 0 ? (
          <Empty>Nobody signed up yet.</Empty>
        ) : (
          <Card className="flex flex-wrap gap-1.5 p-3">
            {event.participants.map((p) => (
              <Link
                key={p.id}
                href={`/members/${p.member.id}`}
                className="rounded-full border border-line px-2.5 py-1 text-[13px] hover:border-faint hover:bg-ground"
              >
                {p.member.name}
              </Link>
            ))}
          </Card>
        )}
      </Section>

      {notes.length > 0 && (
        <Section title="Recent notes from participants">
          <Card>
            <ul className="divide-y divide-line-soft">
              {notes.map((i) => (
                <li key={i.id} className="px-3.5 py-2.5">
                  <p className="text-[14px] leading-snug">{i.content}</p>
                  <p className="mt-0.5 text-[12px] text-faint">
                    <Link href={`/members/${i.member!.id}`} className="hover:text-ink hover:underline">
                      {i.member!.name}
                    </Link>{" "}
                    · <span className="tnum">{daysOutLabel(i.date)}</span>
                    {i.needsResponse && <span className="text-warn"> · awaiting reply</span>}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}
    </>
  );
}
