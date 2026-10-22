-- CreateTable
CREATE TABLE "UpsellRule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "triggerProductId" TEXT NOT NULL,
    "recommendedIds" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellProduct" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "variantId" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "compareAtPrice" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellImport" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "previousRules" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpsellRule_shopId_themeId_idx" ON "UpsellRule"("shopId", "themeId");

-- CreateIndex
CREATE UNIQUE INDEX "UpsellRule_shopId_themeId_triggerProductId_key" ON "UpsellRule"("shopId", "themeId", "triggerProductId");

-- CreateIndex
CREATE UNIQUE INDEX "UpsellProduct_shopId_productId_key" ON "UpsellProduct"("shopId", "productId");

-- CreateIndex
CREATE INDEX "UpsellImport_shopId_themeId_createdAt_idx" ON "UpsellImport"("shopId", "themeId", "createdAt");
