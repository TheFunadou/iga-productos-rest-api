/*
  Warnings:

  - Changed the type of `shipping_status` on the `Shipping` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'IN_PROCESS', 'IN_TRANSIT', 'RETURNED', 'RETURNED_IN_PROCESS', 'RETURNED_DELIVERED', 'IN_PREPARATION');

-- AlterTable
ALTER TABLE "Shipping" DROP COLUMN "shipping_status",
ADD COLUMN     "shipping_status" "ShippingStatus" NOT NULL;
