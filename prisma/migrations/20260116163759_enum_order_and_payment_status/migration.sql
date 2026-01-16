/*
  Warnings:

  - Changed the type of `status` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `payment_status` to the `OrderPaymentDetails` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderAndPaymentStatus" AS ENUM ('APPROVED', 'REJECTED', 'IN_PROCESS', 'CANCELLED', 'AUTHORIZED', 'PENDING', 'REFOUNDED', 'IN_MEDIATION', 'CHARGED_BACK');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "status" "OrderAndPaymentStatus" NOT NULL;

-- AlterTable
ALTER TABLE "OrderPaymentDetails" ADD COLUMN     "payment_status" "OrderAndPaymentStatus" NOT NULL;
