"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { loadDemoData } from "@/lib/demo-data";

/// Loading the demo set from the browser, so a fresh deployment does not need a
/// local checkout and a terminal that can reach the database.
///
/// It only ever runs against an empty database. Loading the demo data replaces
/// everything, so the guard is checked here rather than trusted to the UI — the
/// button is only rendered in the empty state, but a stale page could still post.

export async function loadDemoDataAction(): Promise<{ ok: boolean; message: string }> {
  try {
    if ((await prisma.course.count()) > 0) {
      return { ok: false, message: "This database already has data — nothing was changed." };
    }

    const counts = await loadDemoData(prisma);
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: `Loaded ${counts.course}: ${counts.members} members, ${counts.events} events, ${counts.tasks} tasks, ${counts.interactions} notes.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not load the demo data.",
    };
  }
}
