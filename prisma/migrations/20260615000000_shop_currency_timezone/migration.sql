-- Persist shop currency + timezone so the analytics dashboard formats money in
-- the merchant's currency and the rollup buckets events into the merchant's
-- local calendar days (instead of always UTC / USD).
ALTER TABLE "Store" ADD COLUMN "currencyCode" TEXT;
ALTER TABLE "Store" ADD COLUMN "ianaTimezone" TEXT;
