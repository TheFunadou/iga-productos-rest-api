/*
  Warnings:

  - A unique constraint covering the columns `[payment_id]` on the table `OrderPaymentDetails` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `last_four_digits` to the `OrderPaymentDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_id` to the `OrderPaymentDetails` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderPaymentDetails" ADD COLUMN     "last_four_digits" TEXT NOT NULL,
ADD COLUMN     "payment_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrderPaymentDetails_payment_id_key" ON "OrderPaymentDetails"("payment_id");
