-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "storeDomain" TEXT NOT NULL,
    "planTier" TEXT NOT NULL DEFAULT 'free',
    "billingMethod" TEXT NOT NULL DEFAULT 'shopify',
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "legacyPrice" INTEGER,
    "notes" TEXT,
    "onboarding" TEXT NOT NULL DEFAULT '{"completed":false,"steps":{"offer_created":false,"settings_configured":false,"previewed":false}}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeConfig" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeDomain_key" ON "Store"("storeDomain");

-- CreateIndex
CREATE INDEX "Store_storeDomain_idx" ON "Store"("storeDomain");

-- CreateIndex
CREATE INDEX "ThemeConfig_shopId_idx" ON "ThemeConfig"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeConfig_shopId_themeId_key" ON "ThemeConfig"("shopId", "themeId");

