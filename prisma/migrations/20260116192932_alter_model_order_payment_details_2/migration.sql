/*
  Warnings:

  - Added the required column `customer_installment_amount` to the `OrderPaymentDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fee_amount` to the `OrderPaymentDetails` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderPaymentDetails" ADD COLUMN     "customer_installment_amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "fee_amount" DECIMAL(10,2) NOT NULL;
