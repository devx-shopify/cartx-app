-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN     "subtotal" INTEGER;

-- AlterTable
ALTER TABLE "DailyStats" ADD COLUMN     "attributedOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "attributedRevenue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nonPromoOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nonPromoRevenue" INTEGER NOT NULL DEFAULT 0;
