-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "promotionId" TEXT,
    "promotionType" TEXT,
    "customerId" TEXT,
    "sessionId" TEXT,
    "cartTotal" INTEGER,
    "itemCount" INTEGER,
    "revenue" INTEGER,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "claims" INTEGER NOT NULL DEFAULT 0,
    "removals" INTEGER NOT NULL DEFAULT 0,
    "upsellAdds" INTEGER NOT NULL DEFAULT 0,
    "couponApplies" INTEGER NOT NULL DEFAULT 0,
    "checkouts" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shopId_createdAt_idx" ON "AnalyticsEvent"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shopId_promotionId_createdAt_idx" ON "AnalyticsEvent"("shopId", "promotionId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shopId_event_createdAt_idx" ON "AnalyticsEvent"("shopId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "DailyStats_shopId_date_idx" ON "DailyStats"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_shopId_date_promotionId_key" ON "DailyStats"("shopId", "date", "promotionId");
