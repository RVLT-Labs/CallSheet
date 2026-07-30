-- AlterTable
ALTER TABLE "invitation" ADD COLUMN     "roleTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "company" TEXT;
