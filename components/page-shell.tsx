import { prisma } from "@/lib/prisma";
import { todayKey, dayKeyToDbDate } from "@/lib/dates";
import GlobalSearch from "@/components/global-search";
import type { CourseStatus } from "@prisma/client";

const PILL: Record<CourseStatus, { cls: string; label: string }> = {
  OPEN: { cls: "open", label: "Course Open" },
  RESTRICTED: { cls: "caution", label: "Restricted Play" },
  CLOSED: { cls: "closed", label: "Course Closed" },
};

/**
 * Top bar + global search + content, in the prototype's order. Every module
 * page renders through this so the course-status pill and the search bar are
 * present on every screen exactly as they were in the reference build.
 */
export default async function PageShell({
  clubId,
  title,
  subtitle,
  children,
}: {
  clubId: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const courseDay = await prisma.courseDay.findUnique({
    where: { clubId_date: { clubId, date: dayKeyToDbDate(todayKey()) } },
  });
  const pill = PILL[courseDay?.status ?? "OPEN"];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-sub">{subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="status-pill">
            <span className={`dot ${pill.cls}`} /> {pill.label}
          </div>
        </div>
      </div>
      <GlobalSearch />
      <div className="content">{children}</div>
    </>
  );
}
