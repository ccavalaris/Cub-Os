"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";
import { formatCents, parseDollarsToCents } from "@/lib/money";

export type TourneyResult = { ok: true; message?: string } | { ok: false; error: string };

async function ownedTournament(clubId: string, tournamentId: string) {
  return prisma.tournament.findFirst({ where: { id: tournamentId, clubId } });
}

/* ------------------------------------------------------------- live scoring */

const scoreSchema = z.object({
  teamId: z.string().min(1),
  thruDelta: z.number().int().min(-1).max(1).default(0),
  scoreDelta: z.number().int().min(-1).max(1).default(0),
});

export async function adjustScoreAction(
  input: z.input<typeof scoreSchema>,
): Promise<TourneyResult> {
  const user = await assertModule("tournament");
  const parsed = scoreSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That adjustment wasn't valid." };
  const { teamId, thruDelta, scoreDelta } = parsed.data;

  const team = await prisma.tournamentTeam.findFirst({
    where: { id: teamId, tournament: { clubId: user.clubId } },
  });
  if (!team) return { ok: false, error: "That team isn't in this field." };

  // A round is 18 holes; scores past ±30 are a typo, not a round.
  const thru = Math.min(18, Math.max(0, team.thru + thruDelta));
  const scoreToPar = Math.min(30, Math.max(-30, team.scoreToPar + scoreDelta));

  await prisma.tournamentTeam.update({
    where: { id: team.id },
    // Any adjustment means the group has reported in.
    data: { thru, scoreToPar, reported: true },
  });

  revalidatePath("/tournament");
  return { ok: true };
}

/* ------------------------------------------------------------------ payouts */

/**
 * Post winnings to the member account behind the team as shop credit — a
 * negative row on the same ledger every other module writes to, so the
 * directory shows it and it can be reversed.
 */
export async function payPayoutAction(payoutId: string): Promise<TourneyResult> {
  const user = await assertModule("tournament");

  const payout = await prisma.payout.findFirst({
    where: { id: payoutId, tournament: { clubId: user.clubId } },
    include: { team: { include: { member: true } }, tournament: true, flight: true },
  });
  if (!payout) return { ok: false, error: "That payout no longer exists." };
  if (payout.status === "PAID") return { ok: false, error: "That payout is already settled." };
  if (!payout.team) return { ok: false, error: "Assign a winning team before paying." };
  if (!payout.team.memberId || !payout.team.member) {
    return {
      ok: false,
      error: `${payout.team.name} has no member account on file — settle this one at the shop.`,
    };
  }

  const member = payout.team.member;

  const done = await prisma.$transaction(async (tx) => {
    // Only a PENDING row transitions, so a double click cannot credit twice.
    const claimed = await tx.payout.updateMany({
      where: { id: payout.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (claimed.count === 0) return false;

    const charge = await tx.memberCharge.create({
      data: {
        clubId: user.clubId,
        memberId: member.id,
        source: "TOURNAMENT_PAYOUT",
        description: `${payout.tournament.name} — ${payout.flight?.name ?? "Overall"} ${payout.place} (shop credit)`,
        // Credit, so it reduces the month-to-date balance.
        amountCents: -payout.amountCents,
        postedById: user.id,
      },
    });
    await tx.payout.update({ where: { id: payout.id }, data: { chargeId: charge.id } });
    return true;
  });

  if (!done) return { ok: false, error: "That payout is already settled." };

  revalidatePath("/tournament");
  revalidatePath("/members");
  return {
    ok: true,
    message: `${formatCents(payout.amountCents)} credited to ${member.household}.`,
  };
}

export async function reversePayoutAction(payoutId: string): Promise<TourneyResult> {
  const user = await assertModule("tournament");

  const payout = await prisma.payout.findFirst({
    where: { id: payoutId, tournament: { clubId: user.clubId } },
    include: { charge: true },
  });
  if (!payout) return { ok: false, error: "That payout no longer exists." };
  if (payout.status !== "PAID") return { ok: false, error: "That payout hasn't been settled." };

  await prisma.$transaction(async (tx) => {
    if (payout.chargeId) {
      await tx.payout.update({ where: { id: payout.id }, data: { chargeId: null } });
      await tx.memberCharge.delete({ where: { id: payout.chargeId } });
    }
    await tx.payout.update({
      where: { id: payout.id },
      data: { status: "PENDING", paidAt: null },
    });
  });

  revalidatePath("/tournament");
  revalidatePath("/members");
  return { ok: true, message: "Payout reversed and the credit removed." };
}

const amountSchema = z.object({ payoutId: z.string().min(1), amount: z.string().max(20) });

export async function setPayoutAmountAction(
  input: z.input<typeof amountSchema>,
): Promise<TourneyResult> {
  const user = await assertModule("tournament");
  const parsed = amountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That amount wasn't valid." };

  const payout = await prisma.payout.findFirst({
    where: { id: parsed.data.payoutId, tournament: { clubId: user.clubId } },
  });
  if (!payout) return { ok: false, error: "That payout no longer exists." };
  if (payout.status === "PAID") {
    return { ok: false, error: "Reverse the payout before changing what it pays." };
  }

  const cents = parseDollarsToCents(parsed.data.amount);
  if (cents < 0) return { ok: false, error: "A payout can't be negative." };

  await prisma.payout.update({ where: { id: payout.id }, data: { amountCents: cents } });
  revalidatePath("/tournament");
  return { ok: true };
}

/* ------------------------------------------------------------- field comms */

const messageSchema = z.object({
  tournamentId: z.string().min(1),
  body: z.string().trim().min(1).max(480),
});

/**
 * Records a broadcast. There is no SMS account wired up, so this only ever
 * logs — the UI says so, and `delivery` keeps the record honest rather than
 * implying the field was reached.
 */
export async function logFieldMessageAction(
  input: z.input<typeof messageSchema>,
): Promise<TourneyResult> {
  const user = await assertModule("tournament");
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Write a message before saving it." };

  const tournament = await ownedTournament(user.clubId, parsed.data.tournamentId);
  if (!tournament) return { ok: false, error: "That tournament no longer exists." };

  await prisma.fieldMessage.create({
    data: {
      tournamentId: tournament.id,
      body: parsed.data.body,
      delivery: "LOGGED_ONLY",
      sentById: user.id,
    },
  });

  revalidatePath("/tournament");
  return { ok: true, message: "Saved to the log. Nothing was texted — no SMS account is connected." };
}

/* ---------------------------------------------------------------- weather */

const statusSchema = z.object({
  tournamentId: z.string().min(1),
  status: z.enum(["ACTIVE", "DELAYED", "SUSPENDED", "COMPLETE"]),
  note: z.string().trim().max(240).default(""),
});

const STATUS_NOTE: Record<string, string> = {
  ACTIVE: "Play proceeding as scheduled.",
  DELAYED: "Play delayed — field holding, horn to resume.",
  SUSPENDED: "Play suspended — field cleared from the course.",
  COMPLETE: "Play complete for the day.",
};

export async function setPlayStatusAction(
  input: z.input<typeof statusSchema>,
): Promise<TourneyResult> {
  const user = await assertModule("tournament");
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That status wasn't valid." };

  const tournament = await ownedTournament(user.clubId, parsed.data.tournamentId);
  if (!tournament) return { ok: false, error: "That tournament no longer exists." };

  await prisma.$transaction([
    prisma.tournament.update({
      where: { id: tournament.id },
      data: { status: parsed.data.status },
    }),
    prisma.playStatusEntry.create({
      data: {
        tournamentId: tournament.id,
        status: parsed.data.status,
        note: parsed.data.note || STATUS_NOTE[parsed.data.status],
      },
    }),
  ]);

  revalidatePath("/tournament");
  return { ok: true };
}

/* ---------------------------------------------------------------- rulings */

const rulingSchema = z.object({
  tournamentId: z.string().min(1),
  hole: z.number().int().min(1).max(18),
  decision: z.string().trim().min(1).max(400),
  official: z.string().trim().min(1).max(80),
});

export async function addRulingAction(
  input: z.input<typeof rulingSchema>,
): Promise<TourneyResult> {
  const user = await assertModule("tournament");
  const parsed = rulingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a hole from 1 to 18, the decision, and the official." };
  }

  const tournament = await ownedTournament(user.clubId, parsed.data.tournamentId);
  if (!tournament) return { ok: false, error: "That tournament no longer exists." };

  await prisma.ruling.create({
    data: {
      tournamentId: tournament.id,
      hole: parsed.data.hole,
      decision: parsed.data.decision,
      official: parsed.data.official,
    },
  });

  revalidatePath("/tournament");
  return { ok: true };
}

/* --------------------------------------------------------------- sponsors */

export async function touchSponsorAction(sponsorId: string): Promise<TourneyResult> {
  const user = await assertModule("tournament");

  const updated = await prisma.sponsor.updateMany({
    where: { id: sponsorId, tournament: { clubId: user.clubId } },
    data: { lastContactAt: new Date() },
  });
  if (updated.count === 0) return { ok: false, error: "That sponsor no longer exists." };

  revalidatePath("/tournament");
  return { ok: true };
}
