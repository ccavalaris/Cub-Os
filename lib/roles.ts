import type { Role } from "@prisma/client";

export type ModuleId =
  | "overview"
  | "tee"
  | "lessons"
  | "course"
  | "caddie"
  | "shop"
  | "halfway"
  | "members";

export type NavTab = {
  id: ModuleId;
  num: string;
  label: string;
  href: string;
};

/**
 * Modules shipped in this pilot. Event Logistics and Tournament Ops exist in the
 * prototype but are deliberately not here — see README. A tab that half works in
 * front of a GM is worse than a tab that isn't there.
 */
export const TABS: NavTab[] = [
  { id: "overview", num: "00", label: "Overview", href: "/" },
  { id: "tee", num: "01", label: "Tee Sheet", href: "/tee" },
  { id: "lessons", num: "02", label: "Lesson Book", href: "/lessons" },
  { id: "course", num: "03", label: "Course Conditions", href: "/course" },
  { id: "caddie", num: "04", label: "Caddie Program", href: "/caddie" },
  { id: "shop", num: "05", label: "Pro Shop Inventory", href: "/shop" },
  { id: "halfway", num: "06", label: "Halfway House", href: "/halfway" },
  { id: "members", num: "07", label: "Member Directory", href: "/members" },
];

/** Carried over from the prototype's ROLES map. */
export const ROLE_MODULES: Record<Role, ModuleId[]> = {
  GM: ["overview", "tee", "lessons", "course", "caddie", "shop", "halfway", "members"],
  PRO_SHOP: ["overview", "lessons", "shop", "halfway", "members"],
  CADDIE_MASTER: ["overview", "tee", "caddie", "course"],
  HEAD_PRO: ["overview", "tee", "lessons", "course"],
};

export const ROLE_LABELS: Record<Role, string> = {
  GM: "General Manager",
  HEAD_PRO: "Head Pro",
  PRO_SHOP: "Pro Shop Staff",
  CADDIE_MASTER: "Caddie Master",
};

export function tabsForRole(role: Role): NavTab[] {
  const allowed = ROLE_MODULES[role];
  return TABS.filter((t) => allowed.includes(t.id));
}

export function canAccess(role: Role, moduleId: ModuleId): boolean {
  return ROLE_MODULES[role].includes(moduleId);
}
