-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeDomain" TEXT NOT NULL,
    "planTier" TEXT NOT NULL DEFAULT 'free',
    "billingMethod" TEXT NOT NULL DEFAULT 'shopify',
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "legacyPrice" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeDomain_key" ON "Store"("storeDomain");

-- CreateIndex
CREATE INDEX "Store_storeDomain_idx" ON "Store"("storeDomain");
