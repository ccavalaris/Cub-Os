/**
 * Demo seed for a pilot club.
 *
 * The club here is Exmoor because that is the club in the reference prototype.
 * Nothing about it is special: every row hangs off the Club record, so seeding a
 * different club is a matter of changing this file, not the application.
 */
import { PrismaClient, type StockLocation, type Caddie, type Member, type Instructor } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CLUB = {
  slug: "exmoor",
  name: "Exmoor Country Club",
  crest: "EX",
  markLine: "Club OS · Est. 1896",
  footLine: "HIGHLAND PARK, IL · NORTH SHORE",
  timezone: "America/Chicago",
};

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "clubos2026";

const USERS = [
  { email: "gm@exmoor.test", name: "Katherine Bramwell", role: "GM" as const },
  { email: "pro@exmoor.test", name: "Tom Vance", role: "HEAD_PRO" as const },
  { email: "shop@exmoor.test", name: "Marcus Reed", role: "PRO_SHOP" as const },
  { email: "caddie@exmoor.test", name: "Owen Castille", role: "CADDIE_MASTER" as const },
];

const MEMBERS: Array<[string, string, number, "ACTIVE" | "ON_LEAVE", "CURRENT" | "GRACE_PERIOD" | "PAST_DUE", string | null]> = [
  ["Whitfield, A. & M.", "Full Golf", 4, "ACTIVE", "CURRENT", "8.2"],
  ["Sorensen, R.", "Full Golf", 2, "ACTIVE", "CURRENT", "12.4"],
  ["Delacroix, J.", "House Social", 3, "ACTIVE", "GRACE_PERIOD", null],
  ["Okafor, M.", "Full Golf", 1, "ACTIVE", "CURRENT", "4.1"],
  ["Kessler, T. & L.", "Legacy", 5, "ACTIVE", "CURRENT", "16.8"],
  ["Hargrove, P.", "Non-Resident", 2, "ON_LEAVE", "PAST_DUE", "21.0"],
  ["Nakamura, S.", "Junior Executive", 1, "ACTIVE", "CURRENT", "6.5"],
  ["Chen, W. & family", "Full Golf", 4, "ACTIVE", "CURRENT", "14.2"],
  ["Rivera, D.", "Full Golf", 2, "ACTIVE", "CURRENT", "9.7"],
  ["Sandoval, E.", "Full Golf", 3, "ACTIVE", "CURRENT", "11.3"],
];

const CADDIES: Array<[string, "LOOPER" | "STANDARD" | "TOURNAMENT"]> = [
  ["James Marsh", "TOURNAMENT"],
  ["Teddy Odom", "STANDARD"],
  ["Priya Renna", "STANDARD"],
  ["Kevin Doyle", "LOOPER"],
  ["Aiden Fenwick", "TOURNAMENT"],
  ["Rosa Sato", "STANDARD"],
  ["Marcus Webb", "LOOPER"],
  ["Diane Holt", "STANDARD"],
  ["Lena Brandt", "LOOPER"],
  ["Sam Pruitt", "STANDARD"],
];

// [name, category, stock, reorderPoint, priceCents]
const PRO_SHOP: Array<[string, string, number, number, number]> = [
  ["Titleist Pro V1 (dz)", "Balls", 34, 15, 5400],
  ["Club Logo Polo — Navy", "Apparel", 6, 10, 8800],
  ["FootJoy Pro/SL Glove", "Accessories", 22, 12, 2400],
  ["Club Logo Visor", "Apparel", 3, 8, 3200],
  ["Scotty Cameron Headcover", "Accessories", 9, 5, 6500],
  ["Callaway Chrome Soft (dz)", "Balls", 18, 15, 4800],
  ["Rangefinder — Bushnell Pro", "Equipment", 2, 4, 34000],
  ["Club Logo Quarter-Zip", "Apparel", 11, 8, 9600],
];

const HALFWAY: Array<[string, string, number, number, number]> = [
  ["Bottled Water", "Beverage", 96, 48, 300],
  ["Gatorade", "Beverage", 54, 36, 400],
  ["Domestic Beer (can)", "Beverage", 40, 48, 600],
  ["Craft Beer (can)", "Beverage", 28, 24, 800],
  ["Soft Drink", "Beverage", 72, 36, 300],
  ["Turn Dog", "Food", 22, 20, 600],
  ["Grilled Chicken Wrap", "Food", 9, 12, 1100],
  ["Trail Mix / Nuts", "Snack", 15, 18, 400],
  ["Candy Bar", "Snack", 33, 24, 300],
  ["Fresh Fruit", "Snack", 8, 12, 300],
];

const PARS = [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4];
const YARDS = [410, 432, 181, 548, 404, 198, 438, 561, 392, 425, 168, 401, 575, 436, 175, 455, 538, 395];
const PINS: Array<"A" | "B" | "C"> = ["B", "C", "A", "B", "B", "A", "C", "B", "A", "B", "C", "B", "A", "C", "B", "B", "A", "C"];

const SIGNATURE_NOTES: Record<number, string> = {
  4: "No. 1 handicap hole — Ross's bunkering guards the entire approach.",
  11: "Shortest hole — 168 yards, severely sloped shell green.",
  13: "Longest hole on the course — 575-yard par 5.",
};

const MAINT_LOG: Array<[string, string]> = [
  ["5:30a", "Frost delay lifted, course opened for play."],
  ["5:45a", "Morning mow complete — shell greens, tees, approaches."],
  ["6:10a", "Cups reset on 1, 5, 9, 14. Sand raked all Ross-era bunkers, front nine."],
];

const INSTRUCTORS = [
  { name: "K. Bramwell", title: "Director of Instruction" },
  { name: "T. Vance", title: "Head Professional" },
  { name: "M. Reed", title: "Teaching Professional" },
];

function utcDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function minutesToLabel(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")}${h24 >= 12 ? "pm" : "am"}`;
}

/**
 * Delete a club and everything under it, child-first.
 *
 * Most relations cascade from Club, but SaleLine -> Product is deliberately
 * Restrict: a product that has been sold must not be deletable, or the sale
 * history would be rewritten underneath the ledger. That protection also blocks
 * a cascading club delete, so teardown walks the graph explicitly.
 */
async function teardownClub(clubId: string): Promise<void> {
  await prisma.$transaction([
    prisma.memberCharge.deleteMany({ where: { clubId } }),
    prisma.saleLine.deleteMany({ where: { sale: { clubId } } }),
    prisma.sale.deleteMany({ where: { clubId } }),
    prisma.lesson.deleteMany({ where: { clubId } }),
    prisma.teeSlot.deleteMany({ where: { clubId } }),
    prisma.product.deleteMany({ where: { clubId } }),
    prisma.instructor.deleteMany({ where: { clubId } }),
    prisma.caddie.deleteMany({ where: { clubId } }),
    prisma.member.deleteMany({ where: { clubId } }),
    prisma.hole.deleteMany({ where: { clubId } }),
    prisma.courseDay.deleteMany({ where: { clubId } }),
    prisma.maintLogEntry.deleteMany({ where: { clubId } }),
    prisma.user.deleteMany({ where: { clubId } }),
    prisma.club.delete({ where: { id: clubId } }),
  ]);
}

async function main() {
  const today = utcDate(new Date());

  // Idempotent: re-running the seed refreshes the demo club rather than
  // stacking a second copy of it.
  const existing = await prisma.club.findUnique({ where: { slug: CLUB.slug } });
  if (existing) {
    await teardownClub(existing.id);
    console.log(`Removed previous "${CLUB.slug}" club data.`);
  }

  const club = await prisma.club.create({ data: CLUB });
  console.log(`Created club: ${club.name}`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.createMany({
    data: USERS.map((u) => ({ ...u, clubId: club.id, passwordHash })),
  });
  console.log(`Created ${USERS.length} staff logins (password: ${DEMO_PASSWORD})`);

  const members: Member[] = [];
  for (const [household, membershipType, familySize, status, dues, handicap] of MEMBERS) {
    members.push(
      await prisma.member.create({
        data: {
          clubId: club.id,
          household,
          membershipType,
          familySize,
          status,
          dues,
          handicap,
          lastVisit: new Date(Date.now() - Math.floor(Math.random() * 6) * 86_400_000),
        },
      }),
    );
  }
  console.log(`Created ${members.length} member households`);

  const caddies: Caddie[] = [];
  for (const [name, tier] of CADDIES) {
    caddies.push(
      await prisma.caddie.create({
        data: { clubId: club.id, name, tier, status: "AVAILABLE" },
      }),
    );
  }
  console.log(`Created ${caddies.length} caddies`);

  const productData = [
    ...PRO_SHOP.map((p) => ["PRO_SHOP" as StockLocation, ...p] as const),
    ...HALFWAY.map((p) => ["HALFWAY_HOUSE" as StockLocation, ...p] as const),
  ];
  await prisma.product.createMany({
    data: productData.map(([location, name, category, stock, reorderPoint, priceCents]) => ({
      clubId: club.id,
      location,
      name,
      category,
      stock,
      reorderPoint,
      priceCents,
    })),
  });
  console.log(`Created ${productData.length} products across both outlets`);

  await prisma.hole.createMany({
    data: Array.from({ length: 18 }, (_, i) => ({
      clubId: club.id,
      number: i + 1,
      par: PARS[i],
      yards: YARDS[i],
      pin: PINS[i],
      status: i === 7 || i === 12 ? ("CART_PATH_ONLY" as const) : ("OPEN" as const),
      note:
        i === 7
          ? "Cart path only — soft turf near landing area."
          : i === 12
            ? "Cart path only — irrigation repair on left side."
            : (SIGNATURE_NOTES[i + 1] ?? "Normal play. No restrictions."),
    })),
  });

  await prisma.courseDay.create({
    data: {
      clubId: club.id,
      date: today,
      status: "OPEN",
      note: "Shell greens rolling true. No restrictions in effect.",
    },
  });

  for (const [i, [label, text]] of MAINT_LOG.entries()) {
    await prisma.maintLogEntry.create({
      data: {
        clubId: club.id,
        label,
        text,
        // Ordered so the log reads most-recent-first in the UI.
        loggedAt: new Date(Date.now() - (MAINT_LOG.length - i) * 3_600_000),
      },
    });
  }
  console.log("Created course card, today's status, and maintenance log");

  const instructors: Instructor[] = [];
  for (const i of INSTRUCTORS) {
    instructors.push(await prisma.instructor.create({ data: { clubId: club.id, ...i } }));
  }

  // ---- today's tee sheet, part-booked so a demo opens onto a real morning ----
  const TEE_START = 7 * 60;
  const TEE_INTERVAL = 10;
  const TEE_COUNT = 48;

  const bookings: Array<[number, string, "CART" | "WALKING", number | null, number | null]> = [
    // [slot index, group, mode, caddie index, member index]
    [0, "Whitfield / Sorensen", "WALKING", 0, 0],
    [1, "Cho / Park", "CART", 1, null],
    [3, "R. Ainsley +3", "CART", null, null],
    [5, "Okafor / guest", "WALKING", 2, 3],
    [8, "Thompson foursome", "CART", 3, null],
    [9, "Kessler / Vance", "CART", null, 4],
    [11, "Hargrove +2", "WALKING", 4, 5],
    [12, "Nakamura / Blackwood", "CART", null, 6],
    [14, "Chen party of 4", "WALKING", 5, 7],
    [16, "Rivera / guest", "CART", null, 8],
    [17, "Sandoval foursome", "CART", null, 9],
  ];
  const blocked = [7];

  const bookedByIndex = new Map(bookings.map((b) => [b[0], b]));

  for (let i = 0; i < TEE_COUNT; i++) {
    const sortKey = TEE_START + i * TEE_INTERVAL;
    const booking = bookedByIndex.get(i);
    const isBlocked = blocked.includes(i);

    await prisma.teeSlot.create({
      data: {
        clubId: club.id,
        date: today,
        sortKey,
        teeTime: minutesToLabel(sortKey),
        status: booking ? "BOOKED" : isBlocked ? "BLOCKED" : "OPEN",
        groupName: booking ? booking[1] : isBlocked ? "Blocked — maint window" : "",
        mode: booking ? booking[2] : null,
        caddieId: booking && booking[3] !== null ? caddies[booking[3]].id : null,
        memberId: booking && booking[4] !== null ? members[booking[4]].id : null,
      },
    });
  }

  // Caddies with a loop on the sheet are on loop; the rest stay available.
  const assigned = bookings.filter((b) => b[3] !== null).map((b) => caddies[b[3]!].id);
  await prisma.caddie.updateMany({
    where: { id: { in: assigned } },
    data: { status: "ON_LOOP" },
  });
  await prisma.caddie.updateMany({
    where: { clubId: club.id, name: { in: ["Lena Brandt", "Sam Pruitt"] } },
    data: { status: "OFF_TODAY" },
  });
  console.log(`Created today's tee sheet — ${bookings.length} of ${TEE_COUNT} slots booked`);

  // ---- today's lesson book ----
  const LESSON_START = 8 * 60;
  const LESSON_COUNT = 8;

  // [instructor index, slot index, member index | null, guest, type, minutes, rateCents]
  const lessonBookings: Array<[number, number, number | null, string, string, number, number]> = [
    [0, 0, 1, "", "Full Swing", 60, 14000],
    [0, 2, 3, "", "Playing Lesson — 9 Holes", 120, 27500],
    [0, 5, 0, "", "Short Game", 60, 14000],
    [0, 7, null, "Junior Clinic (6)", "Junior Group", 60, 4500],
    [1, 0, 2, "", "Putting", 30, 8000],
    [1, 1, 6, "", "Full Swing", 60, 11000],
    [1, 3, 4, "", "Short Game", 30, 8000],
    [1, 6, 5, "", "Full Swing", 60, 11000],
    [2, 1, 7, "", "Club Fitting", 60, 12500],
    [2, 5, null, "Guest — D. Sandoval", "Full Swing", 60, 11000],
  ];
  const lessonKey = new Map(
    lessonBookings.map((b) => [`${b[0]}:${b[1]}`, b] as const),
  );

  for (let ii = 0; ii < instructors.length; ii++) {
    for (let s = 0; s < LESSON_COUNT; s++) {
      const sortKey = LESSON_START + s * 60;
      const booking = lessonKey.get(`${ii}:${s}`);
      // Everyone's blocked over the lunch hour.
      const isLunch = sortKey === 12 * 60;

      await prisma.lesson.create({
        data: {
          clubId: club.id,
          date: today,
          instructorId: instructors[ii].id,
          sortKey,
          startTime: minutesToLabel(sortKey),
          status: booking ? "BOOKED" : isLunch ? "BLOCKED" : "OPEN",
          memberId: booking && booking[2] !== null ? members[booking[2]].id : null,
          guestName: booking ? booking[3] : "",
          lessonType: booking ? booking[4] : "",
          minutes: booking ? booking[5] : 0,
          rateCents: booking ? booking[6] : 0,
        },
      });
    }
  }
  console.log(`Created today's lesson book — ${lessonBookings.length} lessons booked`);

  // ---- a few charges already on the books, so MTD isn't all zeroes ----
  const proV1 = await prisma.product.findFirst({
    where: { clubId: club.id, name: "Titleist Pro V1 (dz)" },
  });
  const glove = await prisma.product.findFirst({
    where: { clubId: club.id, name: "FootJoy Pro/SL Glove" },
  });
  const turnDog = await prisma.product.findFirst({
    where: { clubId: club.id, name: "Turn Dog" },
  });

  const priorSales: Array<[typeof proV1, number, number, number]> = [
    [proV1, 1, 0, 3],   // [product, qty, member index, hours ago]
    [glove, 2, 3, 5],
    [turnDog, 4, 7, 2],
  ];

  for (const [product, qty, memberIdx, hoursAgo] of priorSales) {
    if (!product) continue;
    const total = product.priceCents * qty;
    const soldAt = new Date(Date.now() - hoursAgo * 3_600_000);

    const sale = await prisma.sale.create({
      data: {
        clubId: club.id,
        location: product.location,
        tender: "MEMBER_ACCOUNT",
        memberId: members[memberIdx].id,
        totalCents: total,
        soldAt,
        lines: {
          create: [
            {
              productId: product.id,
              quantity: qty,
              unitPriceCents: product.priceCents,
              lineTotalCents: total,
            },
          ],
        },
      },
    });

    await prisma.memberCharge.create({
      data: {
        clubId: club.id,
        memberId: members[memberIdx].id,
        source: product.location === "PRO_SHOP" ? "PRO_SHOP" : "HALFWAY_HOUSE",
        description: `${product.name} ×${qty}`,
        amountCents: total,
        postedAt: soldAt,
        saleId: sale.id,
      },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: { decrement: qty } },
    });
  }
  console.log(`Posted ${priorSales.length} prior sales to member accounts`);

  console.log("\nSeed complete.\n");
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(14)} ${u.email}  /  ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
