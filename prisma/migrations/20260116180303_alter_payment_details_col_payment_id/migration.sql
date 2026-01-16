/*
  Warnings:

  - Changed the type of `payment_id` on the `OrderPaymentDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "OrderPaymentDetails" DROP COLUMN "payment_id",
ADD COLUMN     "payment_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrderPaymentDetails_payment_id_key" ON "OrderPaymentDetails"("payment_id");
