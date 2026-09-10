import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { courseState } from "@/lib/course";
import { isOpen } from "@/lib/derive";
import { daysOutLabel } from "@/lib/dates";
import { Card, Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const state = await courseState();
  if (state.status !== "ok") return null; // the layout renders the setup screen
  const course = state.course;
  const members = await prisma.member.findMany({
    where: { courseId: course.id },
    include: {
      tasks: true,
      interactions: { orderBy: { date: "desc" }, take: 1 },
      events: { include: { event: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <h1 className="display pt-2 text-[34px] leading-[1.1]">Members</h1>
      <p className="mb-7 mt-1 text-[13.5px] text-muted">
        {members.length} members. Profiles are built from the notes you add, not typed in.
      </p>

      {members.length === 0 ? (
        <Empty>No members yet.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-line-soft">
            {members.map((m) => {
              const open = m.tasks.filter(isOpen).length;
              const waiting = m.interactions[0]?.needsResponse ?? false;
              return (
                <li key={m.id}>
                  <Link
                    href={`/members/${m.id}`}
                    className="flex items-start justify-between gap-3 px-3.5 py-3 hover:bg-ground"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[15px] font-medium">
                        {m.name}
                        {waiting && (
                          <span className="rounded-full border border-warn-line bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">
                            Awaiting reply
                          </span>
                        )}
                      </p>
                      {m.interactions[0] && (
                        <p className="mt-0.5 truncate text-[13px] text-muted">
                          {m.interactions[0].content}
                        </p>
                      )}
                      <p className="mt-0.5 text-[12px] text-faint">
                        {open > 0 && `${open} open task${open === 1 ? "" : "s"}`}
                        {open > 0 && m.events.length > 0 && " · "}
                        {m.events.length > 0 &&
                          `${m.events.length} event${m.events.length === 1 ? "" : "s"}`}
                        {open === 0 && m.events.length === 0 && "No open items"}
                      </p>
                    </div>
                    {m.interactions[0] && (
                      <span className="shrink-0 text-[12px] text-faint tnum">
                        {daysOutLabel(m.interactions[0].date)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
