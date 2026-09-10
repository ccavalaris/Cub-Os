import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { courseState } from "@/lib/course";
import { isOpen } from "@/lib/derive";
import { toTaskRow } from "@/lib/rows";
import { daysOutLabel, formatDate } from "@/lib/dates";
import { Card, Empty, Section } from "@/components/ui";
import { TaskRow } from "@/components/task-row";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await courseState();
  if (state.status !== "ok") return null; // the layout renders the setup screen
  const course = state.course;

  const member = await prisma.member.findFirst({
    where: { id, courseId: course.id },
    include: {
      tasks: { include: { event: true, member: true }, orderBy: { dueDate: "asc" } },
      interactions: { orderBy: { date: "desc" } },
      events: { include: { event: true } },
    },
  });

  if (!member) notFound();

  const open = member.tasks.filter(isOpen);
  const done = member.tasks.filter((t) => !isOpen(t));
  const upcoming = member.events
    .map((ep) => ep.event)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <>
      <Link href="/members" className="text-[13px] text-muted hover:text-ink">
        ← Members
      </Link>

      <h1 className="display mt-2.5 text-[32px] leading-[1.12]">{member.name}</h1>
      <p className="mb-6 mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-muted">
        {member.email && <span>{member.email}</span>}
        {member.phone && <span className="tnum">{member.phone}</span>}
      </p>

      {member.notes && (
        <Section title="Preferences">
          <Card className="px-3.5 py-3 text-[14px] leading-relaxed">{member.notes}</Card>
        </Section>
      )}

      <Section title="Open tasks" hint={open.length ? `${open.length}` : undefined}>
        {open.length === 0 ? (
          <Empty>Nothing open for {member.name}.</Empty>
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

      <Section title="Upcoming events">
        {upcoming.length === 0 ? (
          <Empty>Not signed up for anything.</Empty>
        ) : (
          <Card>
            <ul className="divide-y divide-line-soft">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.id}`}
                    className="flex items-baseline justify-between gap-3 px-3.5 py-2.5 hover:bg-ground"
                  >
                    <span className="text-[14px] font-medium">{e.name}</span>
                    <span className="shrink-0 text-[12px] text-muted tnum">
                      {formatDate(e.date)} · {daysOutLabel(e.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section
        title="Recent context"
        hint={member.interactions.length ? `${member.interactions.length}` : undefined}
      >
        {member.interactions.length === 0 ? (
          <Empty>No notes yet. Add one from the Command Center.</Empty>
        ) : (
          <Card>
            <ul className="divide-y divide-line-soft">
              {member.interactions.map((i) => (
                <li key={i.id} className="px-3.5 py-2.5">
                  <p className="text-[14px] leading-snug">{i.content}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[12px] text-faint">
                    <span className="tnum">{daysOutLabel(i.date)}</span>
                    <span aria-hidden>·</span>
                    <span>{i.source.toLowerCase().replace("_", " ")}</span>
                    {i.needsResponse && (
                      <span className="rounded-full border border-warn-line bg-warn-soft px-2 py-0.5 font-medium text-warn">
                        Awaiting reply
                      </span>
                    )}
                  </p>
                </li>
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
    </>
  );
}
