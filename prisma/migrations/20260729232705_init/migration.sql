-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FilmStatus" AS ENUM ('active', 'wrapped');

-- CreateEnum
CREATE TYPE "HalfDay" AS ENUM ('AM', 'PM');

-- CreateEnum
CREATE TYPE "AvailabilityTier" AS ENUM ('best', 'ok', 'unavailable');

-- CreateEnum
CREATE TYPE "AvailabilitySource" AS ENUM ('manual', 'recurring');

-- CreateEnum
CREATE TYPE "ShootStatus" AS ENUM ('tentative', 'confirmed');

-- CreateEnum
CREATE TYPE "ShootSlotKind" AS ENUM ('required', 'general');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'declined');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "activeOrganizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "posterUrl" TEXT,
    "status" "FilmStatus" NOT NULL DEFAULT 'active',
    "showTentativeToCrew" BOOLEAN NOT NULL DEFAULT false,
    "showCrewContactsToCrew" BOOLEAN NOT NULL DEFAULT false,
    "showAvailabilityToCrew" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "halfDay" "HalfDay" NOT NULL,
    "tier" "AvailabilityTier" NOT NULL,
    "source" "AvailabilitySource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringAvailabilityRule" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "halfDay" "HalfDay",
    "tier" "AvailabilityTier" NOT NULL,
    "label" TEXT,
    "effectiveStart" DATE NOT NULL,
    "effectiveEnd" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringAvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shoot" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "status" "ShootStatus" NOT NULL DEFAULT 'tentative',
    "locationAddress" TEXT,
    "locationMapUrl" TEXT,
    "locationNotes" TEXT,
    "notes" TEXT,
    "icsUid" TEXT NOT NULL,
    "icsSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootDay" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "halfDay" "HalfDay" NOT NULL,
    "defaultCallTime" TEXT NOT NULL,

    CONSTRAINT "ShootDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootSlot" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "kind" "ShootSlotKind" NOT NULL,
    "membershipId" TEXT,
    "placeholderLabel" TEXT,

    CONSTRAINT "ShootSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootInvite" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallTimeOverride" (
    "id" TEXT NOT NULL,
    "shootInviteId" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "callTime" TEXT NOT NULL,

    CONSTRAINT "CallTimeOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "Availability_membershipId_idx" ON "Availability"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_membershipId_date_halfDay_key" ON "Availability"("membershipId", "date", "halfDay");

-- CreateIndex
CREATE INDEX "RecurringAvailabilityRule_membershipId_idx" ON "RecurringAvailabilityRule"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Shoot_icsUid_key" ON "Shoot"("icsUid");

-- CreateIndex
CREATE INDEX "Shoot_filmId_idx" ON "Shoot"("filmId");

-- CreateIndex
CREATE UNIQUE INDEX "ShootDay_shootId_date_halfDay_key" ON "ShootDay"("shootId", "date", "halfDay");

-- CreateIndex
CREATE INDEX "ShootSlot_shootId_idx" ON "ShootSlot"("shootId");

-- CreateIndex
CREATE INDEX "ShootSlot_membershipId_idx" ON "ShootSlot"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShootInvite_token_key" ON "ShootInvite"("token");

-- CreateIndex
CREATE INDEX "ShootInvite_membershipId_idx" ON "ShootInvite"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShootInvite_shootId_membershipId_key" ON "ShootInvite"("shootId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "CallTimeOverride_shootInviteId_shootDayId_key" ON "CallTimeOverride"("shootInviteId", "shootDayId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringAvailabilityRule" ADD CONSTRAINT "RecurringAvailabilityRule_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shoot" ADD CONSTRAINT "Shoot_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDay" ADD CONSTRAINT "ShootDay_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "Shoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootSlot" ADD CONSTRAINT "ShootSlot_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "Shoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootSlot" ADD CONSTRAINT "ShootSlot_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootInvite" ADD CONSTRAINT "ShootInvite_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "Shoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootInvite" ADD CONSTRAINT "ShootInvite_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTimeOverride" ADD CONSTRAINT "CallTimeOverride_shootInviteId_fkey" FOREIGN KEY ("shootInviteId") REFERENCES "ShootInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTimeOverride" ADD CONSTRAINT "CallTimeOverride_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

