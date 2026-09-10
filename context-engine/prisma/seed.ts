import { PrismaClient } from "@prisma/client";
import { loadDemoData, DEFAULT_COURSE_NAME } from "../lib/demo-data";

/// CLI wrapper around lib/demo-data.ts. Loading the demo set replaces whatever
/// is already there, which is right for a demo database and catastrophic for
/// one in use — so this refuses unless the database is empty or --force is
/// passed explicitly.

const prisma = new PrismaClient();

async function main() {
  const force = process.argv.includes("--force");
  const existing = await prisma.course.count();
  if (existing > 0 && !force) {
    console.error(
      "This database already has data. Seeding would delete it.\n" +
        "Run `npm run seed -- --force` if you really want to replace it.",
    );
    process.exit(1);
  }

  // npm run seed -- --name "Exmoor Country Club"
  const nameFlag = process.argv.indexOf("--name");
  const courseName =
    nameFlag !== -1 && process.argv[nameFlag + 1]
      ? process.argv[nameFlag + 1]
      : DEFAULT_COURSE_NAME;

  const counts = await loadDemoData(prisma, courseName);
  console.log(`Seeded ${counts.course}:`, {
    members: counts.members,
    events: counts.events,
    tasks: counts.tasks,
    interactions: counts.interactions,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
