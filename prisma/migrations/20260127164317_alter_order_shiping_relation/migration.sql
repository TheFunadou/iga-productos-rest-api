/*
  Warnings:

  - A unique constraint covering the columns `[order_id]` on the table `Shipping` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Shipping_order_id_key" ON "Shipping"("order_id");
