-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN     "promotionName" TEXT;

-- AlterTable
ALTER TABLE "DailyStats" ADD COLUMN     "promotionName" TEXT,
ADD COLUMN     "promotionType" TEXT;
