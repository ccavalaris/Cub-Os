-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GM', 'HEAD_PRO', 'PRO_SHOP', 'CADDIE_MASTER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'RESIGNED');

-- CreateEnum
CREATE TYPE "DuesStatus" AS ENUM ('CURRENT', 'GRACE_PERIOD', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "ChargeSource" AS ENUM ('PRO_SHOP', 'HALFWAY_HOUSE', 'LESSON', 'MANUAL');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('OPEN', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PlayMode" AS ENUM ('CART', 'WALKING');

-- CreateEnum
CREATE TYPE "CaddieStatus" AS ENUM ('AVAILABLE', 'ON_LOOP', 'OFF_TODAY');

-- CreateEnum
CREATE TYPE "CaddieTier" AS ENUM ('LOOPER', 'STANDARD', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "StockLocation" AS ENUM ('PRO_SHOP', 'HALFWAY_HOUSE');

-- CreateEnum
CREATE TYPE "TenderType" AS ENUM ('MEMBER_ACCOUNT', 'CASH');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('OPEN', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "HoleStatus" AS ENUM ('OPEN', 'CART_PATH_ONLY');

-- CreateEnum
CREATE TYPE "PinPosition" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('OPEN', 'RESTRICTED', 'CLOSED');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "crest" TEXT NOT NULL DEFAULT 'CO',
    "markLine" TEXT NOT NULL DEFAULT 'Club OS',
    "footLine" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "household" TEXT NOT NULL,
    "membershipType" TEXT NOT NULL,
    "familySize" INTEGER NOT NULL DEFAULT 1,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "dues" "DuesStatus" NOT NULL DEFAULT 'CURRENT',
    "handicap" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "lastVisit" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberCharge" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "source" "ChargeSource" NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedById" TEXT,
    "saleId" TEXT,
    "lessonId" TEXT,

    CONSTRAINT "MemberCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeeSlot" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "teeTime" TEXT NOT NULL,
    "sortKey" INTEGER NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'OPEN',
    "groupName" TEXT NOT NULL DEFAULT '',
    "memberId" TEXT,
    "mode" "PlayMode",
    "caddieId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caddie" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "CaddieTier" NOT NULL DEFAULT 'STANDARD',
    "status" "CaddieStatus" NOT NULL DEFAULT 'AVAILABLE',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Caddie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "location" "StockLocation" NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "location" "StockLocation" NOT NULL,
    "tender" "TenderType" NOT NULL,
    "memberId" TEXT,
    "totalCents" INTEGER NOT NULL,
    "soldById" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Instructor',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "sortKey" INTEGER NOT NULL,
    "instructorId" TEXT NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'OPEN',
    "memberId" TEXT,
    "guestName" TEXT NOT NULL DEFAULT '',
    "lessonType" TEXT NOT NULL DEFAULT '',
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "rateCents" INTEGER NOT NULL DEFAULT 0,
    "charged" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hole" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "yards" INTEGER NOT NULL,
    "status" "HoleStatus" NOT NULL DEFAULT 'OPEN',
    "pin" "PinPosition" NOT NULL DEFAULT 'B',
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Hole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseDay" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintLogEntry" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_clubId_email_key" ON "User"("clubId", "email");

-- CreateIndex
CREATE INDEX "Member_clubId_household_idx" ON "Member"("clubId", "household");

-- CreateIndex
CREATE UNIQUE INDEX "MemberCharge_saleId_key" ON "MemberCharge"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberCharge_lessonId_key" ON "MemberCharge"("lessonId");

-- CreateIndex
CREATE INDEX "MemberCharge_clubId_memberId_postedAt_idx" ON "MemberCharge"("clubId", "memberId", "postedAt");

-- CreateIndex
CREATE INDEX "TeeSlot_clubId_date_idx" ON "TeeSlot"("clubId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TeeSlot_clubId_date_sortKey_key" ON "TeeSlot"("clubId", "date", "sortKey");

-- CreateIndex
CREATE INDEX "Caddie_clubId_status_idx" ON "Caddie"("clubId", "status");

-- CreateIndex
CREATE INDEX "Product_clubId_location_idx" ON "Product"("clubId", "location");

-- CreateIndex
CREATE INDEX "Sale_clubId_location_soldAt_idx" ON "Sale"("clubId", "location", "soldAt");

-- CreateIndex
CREATE INDEX "Instructor_clubId_active_idx" ON "Instructor"("clubId", "active");

-- CreateIndex
CREATE INDEX "Lesson_clubId_date_idx" ON "Lesson"("clubId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_clubId_date_instructorId_sortKey_key" ON "Lesson"("clubId", "date", "instructorId", "sortKey");

-- CreateIndex
CREATE UNIQUE INDEX "Hole_clubId_number_key" ON "Hole"("clubId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CourseDay_clubId_date_key" ON "CourseDay"("clubId", "date");

-- CreateIndex
CREATE INDEX "MaintLogEntry_clubId_loggedAt_idx" ON "MaintLogEntry"("clubId", "loggedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCharge" ADD CONSTRAINT "MemberCharge_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCharge" ADD CONSTRAINT "MemberCharge_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCharge" ADD CONSTRAINT "MemberCharge_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCharge" ADD CONSTRAINT "MemberCharge_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeSlot" ADD CONSTRAINT "TeeSlot_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeSlot" ADD CONSTRAINT "TeeSlot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeeSlot" ADD CONSTRAINT "TeeSlot_caddieId_fkey" FOREIGN KEY ("caddieId") REFERENCES "Caddie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caddie" ADD CONSTRAINT "Caddie_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hole" ADD CONSTRAINT "Hole_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDay" ADD CONSTRAINT "CourseDay_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintLogEntry" ADD CONSTRAINT "MaintLogEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
