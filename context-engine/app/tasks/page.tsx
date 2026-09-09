import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentCourse } from "@/lib/course";
import { isOpen, taskState } from "@/lib/derive";
import { toTaskRow } from "@/lib/rows";
import { Card, Empty } from "@/components/ui";
import { TaskRow } from "@/components/task-row";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "complete", label: "Complete" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const active: FilterKey = FILTERS.some((f) => f.key === filter)
    ? (filter as FilterKey)
    : "open";

  const course = await currentCourse();
  const tasks = await prisma.task.findMany({
    where: { courseId: course.id },
    include: { event: true, member: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const counts = {
    open: tasks.filter(isOpen).length,
    overdue: tasks.filter((t) => taskState(t) === "overdue").length,
    complete: tasks.filter((t) => !isOpen(t)).length,
    all: tasks.length,
  };

  const shown = tasks.filter((t) => {
    const state = taskState(t);
    if (active === "all") return true;
    if (active === "overdue") return state === "overdue";
    if (active === "complete") return state === "complete";
    return state !== "complete";
  });

  // Overdue first, then by due date, then undated — the order they matter in.
  const sorted = [...shown].sort((a, b) => {
    const rank = (s: string) => (s === "overdue" ? 0 : s === "complete" ? 2 : 1);
    const byState = rank(taskState(a)) - rank(taskState(b));
    if (byState !== 0) return byState;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  return (
    <>
      <h1 className="mb-3 text-[22px] font-semibold tracking-tight">Tasks</h1>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "open" ? "/tasks" : `/tasks?filter=${f.key}`}
            aria-current={active === f.key ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active === f.key
                ? "border-accent bg-accent text-white"
                : "border-line text-muted hover:border-faint hover:text-ink"
            }`}
          >
            {f.label}
            <span className="ml-1.5 tnum opacity-70">{counts[f.key]}</span>
          </Link>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Empty>Nothing here.</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-line-soft">
            {sorted.map((t) => (
              <TaskRow key={t.id} task={toTaskRow(t)} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
