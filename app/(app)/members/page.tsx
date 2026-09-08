import { requireModule } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { mtdChargesByMember } from "@/lib/charges";
import { formatCents } from "@/lib/money";
import PageShell from "@/components/page-shell";
import MemberTable from "./member-table";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await requireModule("members");

  const [members, mtd] = await Promise.all([
    prisma.member.findMany({
      where: { clubId: user.clubId },
      orderBy: { household: "asc" },
    }),
    mtdChargesByMember(user.clubId),
  ]);

  const rows = members.map((m) => ({
    id: m.id,
    household: m.household,
    membershipType: m.membershipType,
    familySize: m.familySize,
    status: m.status,
    dues: m.dues,
    handicap: m.handicap,
    mtd: formatCents(mtd.get(m.id) ?? 0),
    lastVisit: m.lastVisit
      ? m.lastVisit.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
  }));

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;

  return (
    <PageShell
      clubId={user.clubId}
      title="Member Directory"
      subtitle={`${members.length} household${members.length === 1 ? "" : "s"} on file · ${activeCount} active`}
    >
      <div className="fade-wrap">
        <div className="section">
          <div className="panel-title">Membership Roll</div>
          <div className="panel-desc">
            Household status, dues, and month-to-date charges at a glance. Pro shop,
            halfway house, and lesson charges post here automatically — click a
            household to see the transactions behind its balance.
          </div>
          <div className="ornament">
            <span />
            <i>&#10070;</i>
            <span className="right" />
          </div>
          <MemberTable rows={rows} />
        </div>
      </div>
    </PageShell>
  );
}
