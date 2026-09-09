import { prisma } from "./prisma";

/// The MVP runs one course, but nothing is hardcoded to a club name — the
/// course is looked up, not assumed, so a second one can be added later
/// without unpicking the queries.

export async function currentCourse() {
  const course = await prisma.course.findFirst({ orderBy: { createdAt: "asc" } });
  if (!course) {
    throw new Error(
      "No course found. Run `npm run seed` to create one with demo data.",
    );
  }
  return course;
}
