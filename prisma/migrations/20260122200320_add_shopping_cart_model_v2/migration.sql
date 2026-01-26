/*
  Warnings:

  - A unique constraint covering the columns `[customer_id]` on the table `ShoppingCart` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ShoppingCart_customer_id_key" ON "ShoppingCart"("customer_id");
