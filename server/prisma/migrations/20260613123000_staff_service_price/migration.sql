ALTER TABLE "StaffService" ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 0;

UPDATE "StaffService"
SET "priceCents" = (
  SELECT "priceCents"
  FROM "ServiceItem"
  WHERE "ServiceItem"."id" = "StaffService"."serviceItemId"
);
