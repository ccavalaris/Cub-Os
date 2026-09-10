import type { PrismaClient, Priority, TaskStatus, InteractionSource, EventStatus } from "@prisma/client";

/// Demo data for a fictional club, and the one place that knows how to load it.
///
/// This lives in lib/ rather than in prisma/seed.ts so the running app can call
/// it too: a freshly deployed instance offers a "Load demo data" button instead
/// of requiring a local checkout and a psql-reachable terminal. The CLI seed is
/// a thin wrapper around the same function.
///
/// Dates are relative to the moment it runs, so the dashboard is never showing
/// a stale week — an event seeded "5 days out" is still 5 days out whenever the
/// demo happens.

function at(days: number, hour = 9): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export type SeedCounts = {
  course: string;
  members: number;
  events: number;
  tasks: number;
  interactions: number;
};

/// Replaces everything in the course tables with the demo set. Callers are
/// responsible for deciding whether replacing is allowed — `prisma/seed.ts`
/// requires --force and the in-app button only offers itself on an empty
/// database.
export const DEFAULT_COURSE_NAME = "Brookhaven Golf Club";

/// The club name is a parameter because a demo lands differently when the
/// dashboard carries the name of the club sitting across the table. The members
/// and events stay fictional — only the name on the door changes.
export async function loadDemoData(
  prisma: PrismaClient,
  courseName: string = DEFAULT_COURSE_NAME,
): Promise<SeedCounts> {
  const name = courseName.trim() || DEFAULT_COURSE_NAME;
  await prisma.$transaction([
    prisma.eventParticipant.deleteMany(),
    prisma.task.deleteMany(),
    prisma.interaction.deleteMany(),
    prisma.context.deleteMany(),
    prisma.event.deleteMany(),
    prisma.member.deleteMany(),
    prisma.course.deleteMany(),
  ]);

  const course = await prisma.course.create({ data: { name } });
  const courseId = course.id;

  const memberSeed = [
    ["John Smith", "jsmith@example.com", "(847) 555-0142", "Prefers morning tee times. Plays Saturdays with a regular foursome."],
    ["Mike Brennan", "mbrennan@example.com", "(847) 555-0198", "John Smith's regular partner. Single-digit handicap."],
    ["Dave Kowalski", "dkowalski@example.com", "(847) 555-0117", "On the greens committee. Very particular about bunker conditions."],
    ["Susan Feldman", "sfeldman@example.com", "(847) 555-0163", "Ladies' league captain. Organizes the Tuesday game."],
    ["Tom Whitfield", "twhitfield@example.com", "(847) 555-0129", "Legacy member. Rarely plays but attends most club events."],
    ["Karen Delgado", "kdelgado@example.com", "(847) 555-0174", "New member this season. Still learning the club's routines."],
    ["Rick Ostrander", "rostrander@example.com", "(847) 555-0155", "Runs a member-guest team every year. Brings four guests."],
    ["Patty Nakamura", "pnakamura@example.com", "(847) 555-0186", "Junior program parent. Two kids in the summer camp."],
    ["Greg Lindqvist", "glindqvist@example.com", "(847) 555-0131", "Club champion two years running. Practices most evenings."],
    ["Ellen Marchetti", "emarchetti@example.com", "(847) 555-0148", "Social member. Books the dining room for family events."],
  ] as const;

  const members = await Promise.all(
    memberSeed.map(([name, email, phone, notes]) =>
      prisma.member.create({ data: { courseId, name, email, phone, notes } }),
    ),
  );
  const byName = Object.fromEntries(members.map((m) => [m.name, m]));

  const eventSeed: [string, number, string, EventStatus][] = [
    ["Men's Member-Guest", 5, "Two-day member-guest. 42 teams, shotgun both mornings.", "PREPARING"],
    ["Demo Day", 2, "Six manufacturers on the range, 10am–3pm.", "READY"],
    ["Ladies' Invitational", 12, "18 holes plus luncheon. Field of 60.", "PREPARING"],
    ["Junior Golf Camp", 21, "Four-day camp for ages 8–14. 24 juniors enrolled.", "PLANNING"],
    ["Club Championship", 34, "36 holes over two days, all flights.", "PLANNING"],
  ];

  const events = await Promise.all(
    eventSeed.map(([name, days, description, status]) =>
      prisma.event.create({ data: { courseId, name, date: at(days), description, status } }),
    ),
  );
  const byEvent = Object.fromEntries(events.map((e) => [e.name, e]));

  const participantSeed: [string, string[]][] = [
    ["Men's Member-Guest", ["John Smith", "Mike Brennan", "Rick Ostrander", "Greg Lindqvist", "Dave Kowalski"]],
    ["Ladies' Invitational", ["Susan Feldman", "Karen Delgado", "Ellen Marchetti"]],
    ["Junior Golf Camp", ["Patty Nakamura"]],
    ["Club Championship", ["Greg Lindqvist", "Mike Brennan", "Dave Kowalski"]],
    ["Demo Day", ["Tom Whitfield", "Karen Delgado"]],
  ];
  for (const [eventName, names] of participantSeed) {
    for (const n of names) {
      await prisma.eventParticipant.create({
        data: { eventId: byEvent[eventName].id, memberId: byName[n].id },
      });
    }
  }

  // [title, dueInDays|null, priority, status, owner, eventName|null, memberName|null]
  const taskSeed: [string, number | null, Priority, TaskStatus, string, string | null, string | null][] = [
    ["Finalize sponsor signage for the 1st and 10th tees", -3, "HIGH", "IN_PROGRESS", "Marisa", "Men's Member-Guest", null],
    ["Confirm cart staging plan with outside ops", -1, "HIGH", "OPEN", "Carlos", "Men's Member-Guest", null],
    ["Order player gifts — 84 pullovers", -6, "HIGH", "COMPLETE", "Marisa", "Men's Member-Guest", null],
    ["Post pairings sheet to the member portal", 4, "HIGH", "OPEN", "Danny", "Men's Member-Guest", null],
    ["Confirm F&B headcount for both mornings", 3, "MEDIUM", "IN_PROGRESS", "Marisa", "Men's Member-Guest", null],
    ["Confirm Rick Ostrander's fourth guest", 2, "MEDIUM", "OPEN", "Danny", "Men's Member-Guest", "Rick Ostrander"],
    ["Set up range for six manufacturer bays", 1, "HIGH", "OPEN", "Carlos", "Demo Day", null],
    ["Confirm rep arrival times", 0, "MEDIUM", "OPEN", "Danny", "Demo Day", null],
    ["Print scorecards for the invitational field", 9, "MEDIUM", "OPEN", "Marisa", "Ladies' Invitational", null],
    ["Confirm luncheon menu with the kitchen", 7, "MEDIUM", "OPEN", "Head Pro", "Ladies' Invitational", null],
    ["Collect entry list from Susan Feldman", 5, "MEDIUM", "OPEN", "Danny", "Ladies' Invitational", "Susan Feldman"],
    ["Hire two additional junior instructors", 14, "HIGH", "OPEN", "Head Pro", "Junior Golf Camp", null],
    ["Order junior loaner sets", 16, "LOW", "OPEN", "Marisa", "Junior Golf Camp", null],
    ["Publish camp schedule to parents", 18, "MEDIUM", "OPEN", "Danny", "Junior Golf Camp", "Patty Nakamura"],
    ["Set flight brackets from current handicaps", 28, "MEDIUM", "OPEN", "Head Pro", "Club Championship", null],
    ["Book the awards dinner room", 30, "LOW", "OPEN", "Marisa", "Club Championship", null],
    ["Return Dave Kowalski's call about bunker rakes", -2, "MEDIUM", "OPEN", "Head Pro", null, "Dave Kowalski"],
    ["Re-grip Greg Lindqvist's wedges", 6, "LOW", "OPEN", "Marisa", null, "Greg Lindqvist"],
    ["Send Karen Delgado the new member packet", 1, "MEDIUM", "OPEN", "Danny", null, "Karen Delgado"],
    ["Reconcile the September range-ball invoice", 8, "LOW", "OPEN", "Head Pro", null, null],
  ];

  for (const [title, due, priority, status, owner, eventName, memberName] of taskSeed) {
    await prisma.task.create({
      data: {
        courseId,
        title,
        priority,
        status,
        owner,
        dueDate: due === null ? null : at(due),
        eventId: eventName ? byEvent[eventName].id : null,
        memberId: memberName ? byName[memberName].id : null,
      },
    });
  }

  // [memberName|null, daysAgo, source, needsResponse, content]
  const interactionSeed: [string | null, number, InteractionSource, boolean, string][] = [
    ["John Smith", 1, "PHONE", true, "Called about Saturday — wants to know if he can bring two guests and asked about an early tee time."],
    ["Dave Kowalski", 2, "PHONE", true, "Left a message about the bunker rakes on 7 and 12 being worn out. Wants a call back."],
    ["Rick Ostrander", 3, "EMAIL", true, "Emailed asking whether his fourth guest can still be added to the member-guest field."],
    ["Susan Feldman", 2, "IN_PERSON", false, "Stopped by the shop with the ladies' invitational entry list. 58 signed up so far."],
    ["Karen Delgado", 4, "TEXT", true, "Texted asking when the new member packet goes out and whether there's an orientation."],
    ["Greg Lindqvist", 5, "IN_PERSON", false, "Dropped off two wedges for regripping. Wants them before the club championship."],
    ["Patty Nakamura", 6, "EMAIL", true, "Asked whether both kids can be in the same camp group."],
    ["Mike Brennan", 3, "TEXT", false, "Confirmed he's playing member-guest with John Smith again this year."],
    ["Ellen Marchetti", 7, "PHONE", false, "Booked the dining room for a family birthday on the 20th."],
    ["Tom Whitfield", 8, "IN_PERSON", false, "Said he'll come to demo day but isn't playing in the member-guest."],
    ["John Smith", 9, "IN_PERSON", false, "Mentioned at the turn that he prefers the early wave whenever possible."],
    ["Dave Kowalski", 11, "IN_PERSON", false, "Greens committee walk-through — flagged drainage on 4 as still soft."],
    ["Susan Feldman", 12, "EMAIL", false, "Sent the ladies' league Tuesday pairings for the next month."],
    ["Rick Ostrander", 14, "PHONE", false, "Confirmed three of his four member-guest guests by name."],
    ["Greg Lindqvist", 15, "IN_PERSON", false, "Asked about practice green hours during the championship setup."],
    ["Karen Delgado", 16, "IN_PERSON", false, "First lesson with Danny. Wants a follow-up series booked."],
    ["Patty Nakamura", 18, "PHONE", false, "Registered both juniors for camp and paid the deposit."],
    ["Mike Brennan", 19, "EMAIL", false, "Asked for the member-guest format sheet from last year."],
    ["Ellen Marchetti", 21, "TEXT", false, "Confirmed the catering headcount for her family event."],
    ["Tom Whitfield", 22, "PHONE", false, "Renewed his locker for the season."],
    [null, 1, "NOTE", false, "Cart 14 pulled from service — battery won't hold a charge. Carlos has the ticket."],
    [null, 2, "NOTE", false, "Range picker down since Tuesday morning. Loaner arriving Thursday."],
    [null, 3, "NOTE", false, "Bag drop staffing thin on Saturday — only one attendant scheduled for the shotgun."],
    [null, 4, "NOTE", false, "Sponsor banners arrived but two are misprinted. Vendor is reprinting."],
    [null, 6, "NOTE", false, "New shipment of gloves and balls checked into the shop."],
    [null, 8, "NOTE", false, "Irrigation on 11 fairway repaired. Superintendent signed off."],
    [null, 10, "NOTE", false, "Halfway house freezer cycling loudly — service call scheduled."],
    [null, 13, "NOTE", false, "Practice green aerated. Back in play in about ten days."],
    [null, 17, "NOTE", false, "Two seasonal outside-ops staff finished for the year."],
    [null, 20, "NOTE", false, "Fall overseeding scheduled for the back nine after the championship."],
  ];

  for (const [memberName, daysAgo, source, needsResponse, content] of interactionSeed) {
    await prisma.interaction.create({
      data: {
        courseId,
        memberId: memberName ? byName[memberName].id : null,
        content,
        source,
        needsResponse,
        date: at(-daysAgo, 14),
      },
    });
  }

  return {
    course: course.name,
    members: members.length,
    events: events.length,
    tasks: taskSeed.length,
    interactions: interactionSeed.length,
  };
}
