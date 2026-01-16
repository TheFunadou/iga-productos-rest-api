/*
  Warnings:

  - The values [REFOUNDED] on the enum `OrderAndPaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderAndPaymentStatus_new" AS ENUM ('APPROVED', 'REJECTED', 'IN_PROCESS', 'CANCELLED', 'AUTHORIZED', 'PENDING', 'REFUNDED', 'IN_MEDIATION', 'CHARGED_BACK');
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderAndPaymentStatus_new" USING ("status"::text::"OrderAndPaymentStatus_new");
ALTER TABLE "OrderPaymentDetails" ALTER COLUMN "payment_status" TYPE "OrderAndPaymentStatus_new" USING ("payment_status"::text::"OrderAndPaymentStatus_new");
ALTER TYPE "OrderAndPaymentStatus" RENAME TO "OrderAndPaymentStatus_old";
ALTER TYPE "OrderAndPaymentStatus_new" RENAME TO "OrderAndPaymentStatus";
DROP TYPE "public"."OrderAndPaymentStatus_old";
COMMIT;
