-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('tentative', 'confirmed');

-- CreateEnum
CREATE TYPE "MeetingSlotKind" AS ENUM ('required', 'general');

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'tentative',
    "title" TEXT,
    "locationAddress" TEXT,
    "locationPlaceId" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "locationMapUrl" TEXT,
    "locationNotes" TEXT,
    "notes" TEXT,
    "icsUid" TEXT NOT NULL,
    "icsSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingDay" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "halfDay" "HalfDay" NOT NULL,
    "defaultStartTime" TEXT NOT NULL,

    CONSTRAINT "MeetingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingSlot" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "kind" "MeetingSlotKind" NOT NULL,
    "membershipId" TEXT,
    "placeholderLabel" TEXT,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingInvite" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "responseSource" "InviteResponseSource" NOT NULL DEFAULT 'crew',
    "overriddenByMembershipId" TEXT,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingCallTimeOverride" (
    "id" TEXT NOT NULL,
    "meetingInviteId" TEXT NOT NULL,
    "meetingDayId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,

    CONSTRAINT "MeetingCallTimeOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_icsUid_key" ON "Meeting"("icsUid");

-- CreateIndex
CREATE INDEX "Meeting_filmId_idx" ON "Meeting"("filmId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingDay_meetingId_date_halfDay_key" ON "MeetingDay"("meetingId", "date", "halfDay");

-- CreateIndex
CREATE INDEX "MeetingSlot_meetingId_idx" ON "MeetingSlot"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingSlot_membershipId_idx" ON "MeetingSlot"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingInvite_token_key" ON "MeetingInvite"("token");

-- CreateIndex
CREATE INDEX "MeetingInvite_membershipId_idx" ON "MeetingInvite"("membershipId");

-- CreateIndex
CREATE INDEX "MeetingInvite_overriddenByMembershipId_idx" ON "MeetingInvite"("overriddenByMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingInvite_meetingId_membershipId_key" ON "MeetingInvite"("meetingId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingCallTimeOverride_meetingInviteId_meetingDayId_key" ON "MeetingCallTimeOverride"("meetingInviteId", "meetingDayId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingDay" ADD CONSTRAINT "MeetingDay_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingSlot" ADD CONSTRAINT "MeetingSlot_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInvite" ADD CONSTRAINT "MeetingInvite_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInvite" ADD CONSTRAINT "MeetingInvite_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInvite" ADD CONSTRAINT "MeetingInvite_overriddenByMembershipId_fkey" FOREIGN KEY ("overriddenByMembershipId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingCallTimeOverride" ADD CONSTRAINT "MeetingCallTimeOverride_meetingInviteId_fkey" FOREIGN KEY ("meetingInviteId") REFERENCES "MeetingInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingCallTimeOverride" ADD CONSTRAINT "MeetingCallTimeOverride_meetingDayId_fkey" FOREIGN KEY ("meetingDayId") REFERENCES "MeetingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
