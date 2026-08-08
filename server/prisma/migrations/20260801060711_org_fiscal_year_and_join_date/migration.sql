-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "join_date" DATE;
