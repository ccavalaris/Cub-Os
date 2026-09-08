import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  // The pilot club's branding on the login card, and the demo sign-ins the
  // seed created. Both come from the database — nothing about a club name is
  // baked into this page.
  const club = await prisma.club.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      users: { orderBy: { role: "asc" }, select: { email: true, name: true, role: true } },
    },
  });

  const accounts = (club?.users ?? []).map((u) => ({
    email: u.email,
    name: u.name,
    roleLabel: ROLE_LABELS[u.role],
  }));

  return (
    <LoginForm
      crest={club?.crest ?? "CO"}
      markLine={club?.markLine ?? "Club OS"}
      clubName={club?.name ?? "Club OS"}
      accounts={accounts}
      demoPassword={process.env.SEED_DEMO_PASSWORD ?? "clubos2026"}
      showAccounts={process.env.SHOW_DEMO_LOGINS !== "false"}
    />
  );
}
