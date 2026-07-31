-- CreateEnum
CREATE TYPE "InviteResponseSource" AS ENUM ('crew', 'organiser');

-- AlterTable
ALTER TABLE "ShootInvite" ADD COLUMN     "responseSource" "InviteResponseSource" NOT NULL DEFAULT 'crew',
ADD COLUMN     "overriddenByMembershipId" TEXT;

-- CreateIndex
CREATE INDEX "ShootInvite_overriddenByMembershipId_idx" ON "ShootInvite"("overriddenByMembershipId");

-- AddForeignKey
ALTER TABLE "ShootInvite" ADD CONSTRAINT "ShootInvite_overriddenByMembershipId_fkey" FOREIGN KEY ("overriddenByMembershipId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
