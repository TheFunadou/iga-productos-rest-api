/*
  Warnings:

  - A unique constraint covering the columns `[order_id,label]` on the table `order_shipping_info` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `label` to the `order_shipping_info` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "order_shipping_info_order_id_key";

-- AlterTable
ALTER TABLE "order_shipping_info" ADD COLUMN     "label" VARCHAR(20) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "order_shipping_info_order_id_label_key" ON "order_shipping_info"("order_id", "label");
