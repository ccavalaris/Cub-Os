import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccess, type ModuleId } from "@/lib/roles";
import { dayKeyToDbDate, todayKey, longDayLabel } from "@/lib/dates";
import { formatCentsShort } from "@/lib/money";
import { needsAttention, daysOutLabel } from "@/lib/events";
import PageShell from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await requireUser();
  const clubId = user.clubId;
  const today = dayKeyToDbDate(todayKey());

  const [
    slots,
    caddies,
    products,
    holes,
    members,
    lessons,
    courseDay,
    proShopToday,
    halfwayToday,
    upcomingEvents,
  ] = await Promise.all([
    prisma.teeSlot.findMany({
      where: { clubId, date: today },
      orderBy: { sortKey: "asc" },
      include: { member: true, caddie: true },
    }),
    prisma.caddie.findMany({ where: { clubId } }),
    prisma.product.findMany({ where: { clubId, active: true } }),
    prisma.hole.findMany({ where: { clubId } }),
    prisma.member.findMany({ where: { clubId }, select: { status: true } }),
    prisma.lesson.findMany({
      where: { clubId, date: today },
      select: { status: true, rateCents: true, charged: true, memberId: true },
    }),
    prisma.courseDay.findUnique({ where: { clubId_date: { clubId, date: today } } }),
    prisma.sale.aggregate({
      where: { clubId, location: "PRO_SHOP", soldAt: { gte: startOfLocalDay() } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { clubId, location: "HALFWAY_HOUSE", soldAt: { gte: startOfLocalDay() } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.event.findMany({
      where: { clubId, date: { gte: today } },
      orderBy: { date: "asc" },
      include: { tasks: { select: { done: true } } },
    }),
  ]);

  const roundsToday = slots.filter((s) => s.status === "BOOKED").length;
  const caddiesOnLoop = caddies.filter((c) => c.status === "ON_LOOP").length;
  const caddiesAvailable = caddies.filter((c) => c.status === "AVAILABLE").length;
  const proShop = products.filter((p) => p.location === "PRO_SHOP");
  const halfway = products.filter((p) => p.location === "HALFWAY_HOUSE");
  const lowShop = proShop.filter((p) => p.stock <= p.reorderPoint).length;
  const lowHalfway = halfway.filter((p) => p.stock <= p.reorderPoint).length;
  const cartPathHoles = holes.filter((h) => h.status === "CART_PATH_ONLY").length;
  const activeMembers = members.filter((m) => m.status === "ACTIVE").length;
  const lessonsBooked = lessons.filter((l) => l.status === "BOOKED");
  const lessonRevenue = lessonsBooked.reduce((s, l) => s + l.rateCents, 0);
  const openLessons = lessons.filter((l) => l.status === "OPEN").length;
  const uncharged = lessonsBooked.filter((l) => !l.charged && l.memberId).length;
  const salesTotal = (proShopToday._sum.totalCents ?? 0) + (halfwayToday._sum.totalCents ?? 0);
  const salesCount = proShopToday._count + halfwayToday._count;
  const eventsNeedingAttention = upcomingEvents.filter((e) =>
    needsAttention(e.date, e.tasks.filter((t) => !t.done).length),
  );
  const nextEvent = upcomingEvents[0] ?? null;

  // Each tile belongs to a module; a role only sees tiles for tabs it can open.
  const pool: Array<{ tab: ModuleId; label: string; value: string; sub: string }> = [
    {
      tab: "tee",
      label: "Rounds Booked Today",
      value: String(roundsToday),
      sub: `of ${slots.length} tee sheet slots`,
    },
    {
      tab: "caddie",
      label: "Caddies On Loop",
      value: String(caddiesOnLoop),
      sub: `${caddiesAvailable} available · ${caddies.length} in program`,
    },
    {
      tab: "lessons",
      label: "Lessons Booked",
      value: String(lessonsBooked.length),
      sub: `${formatCentsShort(lessonRevenue)} in instruction today`,
    },
    {
      tab: "shop",
      label: "Sales Today",
      value: formatCentsShort(salesTotal),
      sub: `${salesCount} transaction${salesCount === 1 ? "" : "s"} across both outlets`,
    },
    {
      tab: "shop",
      label: "Reorder Flags",
      value: String(lowShop),
      sub: "pro shop SKUs need attention",
    },
    {
      tab: "halfway",
      label: "Below Par at Turn",
      value: String(lowHalfway),
      sub: "halfway house items to restock",
    },
    {
      tab: "course",
      label: "Cart-Path Holes",
      value: String(cartPathHoles),
      sub: `of ${holes.length} holes restricted`,
    },
    {
      tab: "members",
      label: "Active Memberships",
      value: String(activeMembers),
      sub: `of ${members.length} households on file`,
    },
    {
      tab: "events",
      label: "Events Needing Attention",
      value: String(eventsNeedingAttention.length),
      sub: nextEvent
        ? `next: ${nextEvent.name} ${daysOutLabel(nextEvent.date)}`
        : "nothing on the books",
    },
  ];
  const tiles = pool.filter((t) => canAccess(user.role, t.tab)).slice(0, 4);

  const nextUp = slots
    .filter((s) => s.status === "BOOKED")
    .slice(0, 5)
    .map((s) => ({
      time: s.teeTime,
      who: s.groupName || s.member?.household || "Booked group",
      mode: s.mode === "CART" ? "Cart" : s.mode === "WALKING" ? "Walking" : "",
      caddie: s.caddie?.name ?? "",
    }));

  const alerts: Array<{ sev: string; text: string }> = [];
  if (courseDay && courseDay.status !== "OPEN") {
    alerts.push({
      sev: "critical",
      text: `Course status: ${courseDay.status === "CLOSED" ? "Course Closed" : "Restricted Play"}`,
    });
  }
  if (canAccess(user.role, "course") && cartPathHoles > 0) {
    alerts.push({
      sev: "warn",
      text: `${cartPathHoles} hole${cartPathHoles > 1 ? "s" : ""} marked cart path only`,
    });
  }
  if (canAccess(user.role, "shop") && lowShop > 0) {
    alerts.push({
      sev: "warn",
      text: `${lowShop} pro shop SKU${lowShop > 1 ? "s" : ""} at or below reorder point`,
    });
  }
  if (canAccess(user.role, "halfway") && lowHalfway > 0) {
    alerts.push({
      sev: "warn",
      text: `${lowHalfway} halfway house item${lowHalfway > 1 ? "s" : ""} below par`,
    });
  }
  if (canAccess(user.role, "lessons") && uncharged > 0) {
    alerts.push({
      sev: "warn",
      text: `${uncharged} booked lesson${uncharged > 1 ? "s" : ""} not yet charged to an account`,
    });
  }
  if (canAccess(user.role, "lessons") && openLessons > 0) {
    alerts.push({
      sev: "info",
      text: `${openLessons} lesson slot${openLessons > 1 ? "s" : ""} still open today`,
    });
  }
  for (const e of eventsNeedingAttention.slice(0, 2)) {
    if (!canAccess(user.role, "events")) break;
    const open = e.tasks.filter((t) => !t.done).length;
    alerts.push({
      sev: "warn",
      text: `${e.name} ${daysOutLabel(e.date)} — ${open} task${open > 1 ? "s" : ""} still open`,
    });
  }
  if (canAccess(user.role, "caddie")) {
    alerts.push({
      sev: "info",
      text: `${caddiesAvailable} caddie${caddiesAvailable === 1 ? "" : "s"} available for assignment`,
    });
  }
  if (alerts.length === 0) {
    alerts.push({ sev: "info", text: "Nothing needs attention right now." });
  }

  return (
    <PageShell
      clubId={clubId}
      title="Overview"
      subtitle={`${longDayLabel(todayKey())} — today's snapshot across the club`}
    >
      <div className="fade-wrap">
        <div className="section">
          <div className="stat-grid">
            {tiles.map((t) => (
              <div key={t.label} className="stat-card">
                <div className="stat-label">{t.label}</div>
                <div className="stat-value">{t.value}</div>
                <div className="stat-sub">{t.sub}</div>
              </div>
            ))}
          </div>

          <div className="overview-grid">
            <div className="mini-panel">
              <div className="mini-panel-title">
                {canAccess(user.role, "tee") ? "Next on the Tee Sheet" : "Today at the Club"}
              </div>
              {!canAccess(user.role, "tee") ? (
                <div className="mini-row">
                  {activeMembers} active household{activeMembers === 1 ? "" : "s"} · {formatCentsShort(salesTotal)} in
                  sales today
                </div>
              ) : nextUp.length === 0 ? (
                <div className="mini-row">No bookings yet today.</div>
              ) : (
                nextUp.map((s, i) => (
                  <div key={i} className="mini-row">
                    <span className="mini-time">{s.time}</span>
                    <span style={{ flex: 1 }}>{s.who}</span>
                    {s.caddie ? <span className="tag caddie">{s.caddie}</span> : null}
                    {s.mode ? <span className="tag">{s.mode}</span> : null}
                  </div>
                ))
              )}
              {canAccess(user.role, "tee") ? (
                <div className="mini-row">
                  <Link href="/tee" className="mini-link">
                    Open the tee sheet &rarr;
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="mini-panel">
              <div className="mini-panel-title">Alerts &amp; Notices</div>
              {alerts.map((a, i) => (
                <div key={i} className="alert-row">
                  <span className={`alert-dot ${a.sev}`} />
                  <span>{a.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function startOfLocalDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
