"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canAccess, type ModuleId } from "@/lib/roles";
import { formatCentsShort } from "@/lib/money";

export type SearchHit = {
  cat: string;
  label: string;
  href: string;
};

/**
 * Global search across the modules the signed-in role can actually open — a
 * Caddie Master never gets an inventory hit back, so search can't leak a module
 * the nav hides.
 */
export async function searchAction(query: string): Promise<SearchHit[]> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 2) return [];

  const clubId = user.clubId;
  const contains = { contains: q, mode: "insensitive" as const };
  const allowed = (m: ModuleId) => canAccess(user.role, m);

  const [members, products, caddies, lessons, slots] = await Promise.all([
    allowed("members")
      ? prisma.member.findMany({
          where: { clubId, household: contains },
          take: 5,
          orderBy: { household: "asc" },
        })
      : [],
    allowed("shop") || allowed("halfway")
      ? prisma.product.findMany({
          where: {
            clubId,
            name: contains,
            location: allowed("shop") && allowed("halfway")
              ? undefined
              : allowed("shop")
                ? "PRO_SHOP"
                : "HALFWAY_HOUSE",
          },
          take: 5,
          orderBy: { name: "asc" },
        })
      : [],
    allowed("caddie")
      ? prisma.caddie.findMany({ where: { clubId, name: contains }, take: 5 })
      : [],
    allowed("lessons")
      ? prisma.lesson.findMany({
          where: {
            clubId,
            OR: [{ guestName: contains }, { member: { household: contains } }],
          },
          include: { member: true, instructor: true },
          take: 5,
          orderBy: { date: "desc" },
        })
      : [],
    allowed("tee")
      ? prisma.teeSlot.findMany({
          where: { clubId, groupName: contains },
          take: 5,
          orderBy: { date: "desc" },
        })
      : [],
  ]);

  const hits: SearchHit[] = [];

  for (const m of members) {
    hits.push({ cat: "Member", label: `${m.household} — ${m.membershipType}`, href: "/members" });
  }
  for (const p of products) {
    const where = p.location === "PRO_SHOP" ? "/shop" : "/halfway";
    hits.push({
      cat: p.location === "PRO_SHOP" ? "Pro Shop" : "Halfway House",
      label: `${p.name} — ${p.stock} on hand · ${formatCentsShort(p.priceCents)}`,
      href: where,
    });
  }
  for (const c of caddies) {
    hits.push({ cat: "Caddie", label: `${c.name} — ${c.tier.toLowerCase()}`, href: "/caddie" });
  }
  for (const l of lessons) {
    const who = l.member?.household ?? l.guestName;
    const day = l.date.toISOString().slice(0, 10);
    hits.push({
      cat: "Lesson",
      label: `${who} — ${l.startTime} with ${l.instructor.name}`,
      href: `/lessons?date=${day}`,
    });
  }
  for (const s of slots) {
    const day = s.date.toISOString().slice(0, 10);
    hits.push({ cat: "Tee Sheet", label: `${s.teeTime} — ${s.groupName}`, href: `/tee?date=${day}` });
  }

  return hits.slice(0, 10);
}
