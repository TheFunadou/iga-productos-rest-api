/*
  Warnings:

  - Added the required column `customer_paid_amount` to the `OrderPaymentDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `received_amount` to the `OrderPaymentDetails` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderPaymentDetails" ADD COLUMN     "customer_paid_amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "received_amount" DECIMAL(10,2) NOT NULL;
