import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { canAccess, type ModuleId } from "@/lib/roles";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  clubId: string;
  clubName: string;
};

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.clubId) redirect("/login");
  const u = session.user;
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role,
    clubId: u.clubId,
    clubName: u.clubName,
  };
}

/**
 * Role gating is enforced here, on the server, for every page and every server
 * action — not by hiding nav links. A Caddie Master who types /shop gets sent
 * back to the overview, and a POS action rejects before it touches stock.
 */
export async function requireModule(moduleId: ModuleId): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccess(user.role, moduleId)) redirect("/");
  return user;
}

export async function assertModule(moduleId: ModuleId): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccess(user.role, moduleId)) {
    throw new Error("Your role does not have access to this module.");
  }
  return user;
}
