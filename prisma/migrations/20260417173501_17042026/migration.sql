/*
  Warnings:

  - Added the required column `final_price` to the `order_items_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "order_items_details" ADD COLUMN     "final_price" DECIMAL(10,2) NOT NULL;
