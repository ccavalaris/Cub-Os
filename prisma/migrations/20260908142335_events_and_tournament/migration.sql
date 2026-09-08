-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('TOURNAMENT', 'PRIVATE_FUNCTION', 'MEMBER_EVENT');

-- CreateEnum
CREATE TYPE "PlayStatus" AS ENUM ('ACTIVE', 'DELAYED', 'SUSPENDED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "MessageDelivery" AS ENUM ('LOGGED_ONLY', 'SENT');

-- AlterEnum
ALTER TYPE "ChargeSource" ADD VALUE 'TOURNAMENT_PAYOUT';

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EventKind" NOT NULL DEFAULT 'MEMBER_EVENT',
    "date" DATE NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTask" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "sortKey" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "eventId" TEXT,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "format" TEXT NOT NULL DEFAULT '',
    "status" "PlayStatus" NOT NULL DEFAULT 'ACTIVE',
    "fieldSize" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortKey" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeeGroup" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "startHole" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "wave" TEXT NOT NULL DEFAULT 'A',
    "sortKey" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "flightId" TEXT,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "memberId" TEXT,
    "caddieId" TEXT,
    "thru" INTEGER NOT NULL DEFAULT 0,
    "scoreToPar" INTEGER NOT NULL DEFAULT 0,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "flightId" TEXT,
    "teamId" TEXT,
    "place" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "chargeId" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMessage" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delivery" "MessageDelivery" NOT NULL DEFAULT 'LOGGED_ONLY',
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruling" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "hole" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "official" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ruling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayStatusEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "status" "PlayStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayStatusEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Hole Sponsor',
    "contactName" TEXT NOT NULL DEFAULT '',
    "lastContactAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_clubId_date_idx" ON "Event"("clubId", "date");

-- CreateIndex
CREATE INDEX "EventTask_eventId_sortKey_idx" ON "EventTask"("eventId", "sortKey");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_eventId_key" ON "Tournament"("eventId");

-- CreateIndex
CREATE INDEX "Tournament_clubId_date_idx" ON "Tournament"("clubId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_tournamentId_name_key" ON "Flight"("tournamentId", "name");

-- CreateIndex
CREATE INDEX "TeeGroup_tournamentId_sortKey_idx" ON "TeeGroup"("tournamentId", "sortKey");

-- CreateIndex
CREATE UNIQUE INDEX "TeeGroup_tournamentId_wave_startHole_key" ON "TeeGroup"("tournamentId", "wave", "startHole");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_scoreToPar_idx" ON "TournamentTeam"("tournamentId", "scoreToPar");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_chargeId_key" ON "Payout"("chargeId");

-- CreateIndex
CREATE INDEX "Payout_tournamentId_idx" ON "Payout"("tournamentId");

-- CreateIndex
CREATE INDEX "FieldMessage_tournamentId_createdAt_idx" ON "FieldMessage"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX "Ruling_tournamentId_loggedAt_idx" ON "Ruling"("tournamentId", "loggedAt");

-- CreateIndex
CREATE INDEX "PlayStatusEntry_tournamentId_loggedAt_idx" ON "PlayStatusEntry"("tournamentId", "loggedAt");

-- CreateIndex
CREATE INDEX "Sponsor_tournamentId_idx" ON "Sponsor"("tournamentId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeGroup" ADD CONSTRAINT "TeeGroup_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_caddieId_fkey" FOREIGN KEY ("caddieId") REFERENCES "Caddie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "MemberCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMessage" ADD CONSTRAINT "FieldMessage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruling" ADD CONSTRAINT "Ruling_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayStatusEntry" ADD CONSTRAINT "PlayStatusEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
