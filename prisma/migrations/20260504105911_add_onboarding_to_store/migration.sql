-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeDomain" TEXT NOT NULL,
    "planTier" TEXT NOT NULL DEFAULT 'free',
    "billingMethod" TEXT NOT NULL DEFAULT 'shopify',
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "legacyPrice" INTEGER,
    "notes" TEXT,
    "onboarding" TEXT NOT NULL DEFAULT '{"completed":false,"steps":{"offer_created":false,"settings_configured":false,"previewed":false}}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Store" ("billingMethod", "createdAt", "id", "isLegacy", "legacyPrice", "notes", "planTier", "storeDomain", "updatedAt") SELECT "billingMethod", "createdAt", "id", "isLegacy", "legacyPrice", "notes", "planTier", "storeDomain", "updatedAt" FROM "Store";
DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";
CREATE UNIQUE INDEX "Store_storeDomain_key" ON "Store"("storeDomain");
CREATE INDEX "Store_storeDomain_idx" ON "Store"("storeDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
