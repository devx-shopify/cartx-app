-- Login-security + activity fields for /enterprise admin users.
ALTER TABLE "AdminUser" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdminUser" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "AdminUser" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
