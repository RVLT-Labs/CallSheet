-- Pivot availability model: AM/PM tiers -> timed soft/hard blocks (issue #70/#71).

-- ---------- Availability & RecurringAvailabilityRule: reset, not converted ----------
-- No heuristic tier->time conversion exists that wouldn't fabricate data the
-- crew member never actually entered (see #70) -- crew re-enter under the new
-- model. Deleting first means the NOT NULL columns below can be added without
-- a default (the table is empty when the ALTER runs).

DELETE FROM "Availability";
DELETE FROM "RecurringAvailabilityRule";

CREATE TYPE "BlockType" AS ENUM ('soft', 'hard');

DROP INDEX "Availability_membershipId_date_halfDay_key";
DROP INDEX "Availability_membershipId_idx";

ALTER TABLE "Availability"
  DROP COLUMN "halfDay",
  DROP COLUMN "tier",
  ADD COLUMN "startTime" TEXT NOT NULL,
  ADD COLUMN "endTime" TEXT NOT NULL,
  ADD COLUMN "blockType" "BlockType" NOT NULL,
  ADD COLUMN "label" TEXT;

ALTER TABLE "RecurringAvailabilityRule"
  DROP COLUMN "halfDay",
  DROP COLUMN "tier",
  ADD COLUMN "startTime" TEXT NOT NULL,
  ADD COLUMN "endTime" TEXT NOT NULL,
  ADD COLUMN "blockType" "BlockType" NOT NULL;

DROP TYPE "AvailabilityTier";

CREATE TABLE "AvailabilityDateOverride" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityDateOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AvailabilityDateOverride_membershipId_date_key" ON "AvailabilityDateOverride"("membershipId", "date");

ALTER TABLE "AvailabilityDateOverride"
  ADD CONSTRAINT "AvailabilityDateOverride_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Availability_membershipId_date_idx" ON "Availability"("membershipId", "date");
CREATE UNIQUE INDEX "Availability_membershipId_date_sourceRuleId_key" ON "Availability"("membershipId", "date", "sourceRuleId");

-- ---------- ShootDay & MeetingDay: backfilled, not reset ----------
-- Unlike crew Availability, existing Shoots/Meetings carry real invites and
-- RSVP history that must survive. Backfill startTime/estimatedEndTime from
-- the old halfDay bucket, then collapse the old "one row per half-day"
-- representation (a full-day shoot was two ShootDay rows, AM + PM, sharing a
-- date) into the new "one row per date" model -- the AM row survives and
-- absorbs the PM row's end time; any call-time override that only existed on
-- the dropped PM row does not carry over (a minor per-person time
-- customization, not roster/RSVP data).

ALTER TABLE "ShootDay" ADD COLUMN "startTime" TEXT;
ALTER TABLE "ShootDay" ADD COLUMN "estimatedEndTime" TEXT;

UPDATE "ShootDay" SET
  "startTime" = CASE "halfDay" WHEN 'AM' THEN '08:00' ELSE '13:00' END,
  "estimatedEndTime" = CASE "halfDay" WHEN 'AM' THEN '16:00' ELSE '21:00' END;

DELETE FROM "CallTimeOverride" WHERE "shootDayId" IN (
  SELECT pm.id FROM "ShootDay" pm
  JOIN "ShootDay" am ON am."shootId" = pm."shootId" AND am.date = pm.date AND am."halfDay" = 'AM'
  WHERE pm."halfDay" = 'PM'
);

UPDATE "ShootDay" am SET "estimatedEndTime" = pm."estimatedEndTime"
FROM "ShootDay" pm
WHERE pm."shootId" = am."shootId" AND pm.date = am.date AND am."halfDay" = 'AM' AND pm."halfDay" = 'PM';

DELETE FROM "ShootDay" pm WHERE pm."halfDay" = 'PM' AND EXISTS (
  SELECT 1 FROM "ShootDay" am WHERE am."shootId" = pm."shootId" AND am.date = pm.date AND am."halfDay" = 'AM'
);

DROP INDEX "ShootDay_shootId_date_halfDay_key";

ALTER TABLE "ShootDay" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "ShootDay" ALTER COLUMN "estimatedEndTime" SET NOT NULL;
ALTER TABLE "ShootDay" DROP COLUMN "halfDay";

CREATE UNIQUE INDEX "ShootDay_shootId_date_key" ON "ShootDay"("shootId", "date");

ALTER TABLE "MeetingDay" ADD COLUMN "estimatedEndTime" TEXT;

UPDATE "MeetingDay" SET "estimatedEndTime" =
  to_char((to_timestamp("defaultStartTime", 'HH24:MI') + interval '1 hour')::time, 'HH24:MI');

DELETE FROM "MeetingCallTimeOverride" WHERE "meetingDayId" IN (
  SELECT pm.id FROM "MeetingDay" pm
  JOIN "MeetingDay" am ON am."meetingId" = pm."meetingId" AND am.date = pm.date AND am."halfDay" = 'AM'
  WHERE pm."halfDay" = 'PM'
);

UPDATE "MeetingDay" am SET "estimatedEndTime" = pm."estimatedEndTime"
FROM "MeetingDay" pm
WHERE pm."meetingId" = am."meetingId" AND pm.date = am.date AND am."halfDay" = 'AM' AND pm."halfDay" = 'PM';

DELETE FROM "MeetingDay" pm WHERE pm."halfDay" = 'PM' AND EXISTS (
  SELECT 1 FROM "MeetingDay" am WHERE am."meetingId" = pm."meetingId" AND am.date = pm.date AND am."halfDay" = 'AM'
);

DROP INDEX "MeetingDay_meetingId_date_halfDay_key";

ALTER TABLE "MeetingDay" ALTER COLUMN "estimatedEndTime" SET NOT NULL;
ALTER TABLE "MeetingDay" DROP COLUMN "halfDay";

CREATE UNIQUE INDEX "MeetingDay_meetingId_date_key" ON "MeetingDay"("meetingId", "date");

DROP TYPE "HalfDay";
