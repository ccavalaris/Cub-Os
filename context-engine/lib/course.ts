import { prisma } from "./prisma";

/// The MVP runs one course, but nothing is hardcoded to a club name — the
/// course is looked up, not assumed, so a second one can be added later
/// without unpicking the queries.
///
/// This returns null rather than throwing when the database has been migrated
/// but not yet seeded. That is a real state a deployment passes through — the
/// build applies migrations, so the first boot always happens against empty
/// tables — and it should produce instructions, not a stack trace.

export async function getCourse() {
  return prisma.course.findFirst({ orderBy: { createdAt: "asc" } });
}
