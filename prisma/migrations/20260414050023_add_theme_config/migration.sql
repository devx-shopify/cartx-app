-- CreateTable
CREATE TABLE "ThemeConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ThemeConfig_shopId_idx" ON "ThemeConfig"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeConfig_shopId_themeId_key" ON "ThemeConfig"("shopId", "themeId");
