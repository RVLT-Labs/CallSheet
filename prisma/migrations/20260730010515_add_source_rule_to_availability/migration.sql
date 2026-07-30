-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "sourceRuleId" TEXT;

-- CreateIndex
CREATE INDEX "Availability_sourceRuleId_idx" ON "Availability"("sourceRuleId");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_sourceRuleId_fkey" FOREIGN KEY ("sourceRuleId") REFERENCES "RecurringAvailabilityRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
