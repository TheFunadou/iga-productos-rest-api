/*
  Warnings:

  - You are about to drop the column `discount_percent` on the `OrderItemsDetails` table. All the data in the column will be lost.
  - You are about to alter the column `discount` on the `OrderItemsDetails` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "OrderItemsDetails" DROP COLUMN "discount_percent",
ALTER COLUMN "discount" SET DEFAULT 0,
ALTER COLUMN "discount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Shipping" ALTER COLUMN "insurance_amount" DROP NOT NULL;
