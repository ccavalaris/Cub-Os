import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tabsForRole, ROLE_LABELS } from "@/lib/roles";
import Sidebar from "@/components/sidebar";
import { signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const club = await prisma.club.findUnique({ where: { id: user.clubId } });

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="app">
      <Sidebar
        crest={club?.crest ?? "CO"}
        markLine={club?.markLine ?? "Club OS"}
        clubName={club?.name ?? "Club OS"}
        footLine={club?.footLine ?? ""}
        tabs={tabsForRole(user.role)}
        userName={user.name}
        roleLabel={ROLE_LABELS[user.role]}
        signOutAction={signOutAction}
      />
      <div className="main">{children}</div>
    </div>
  );
}
