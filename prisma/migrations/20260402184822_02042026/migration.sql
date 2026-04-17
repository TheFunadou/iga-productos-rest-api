/*
  Warnings:

  - You are about to drop the column `customer_address_id` on the `order` table. All the data in the column will be lost.
  - You are about to drop the column `uuid` on the `shipping` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[order_shipping_info_id]` on the table `shipping` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_shipping_info_id` to the `shipping` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_customer_address_id_fkey";

-- DropIndex
DROP INDEX "shipping_order_id_key";

-- DropIndex
DROP INDEX "shipping_uuid_key";

-- AlterTable
ALTER TABLE "order" DROP COLUMN "customer_address_id",
ADD COLUMN     "buyer_email" TEXT NOT NULL DEFAULT 'N/A',
ADD COLUMN     "buyer_name" TEXT NOT NULL DEFAULT 'N/A',
ADD COLUMN     "buyer_phone" TEXT,
ADD COLUMN     "buyer_surname" TEXT NOT NULL DEFAULT 'N/A';

-- AlterTable
ALTER TABLE "shipping" DROP COLUMN "uuid",
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "order_shipping_info_id" TEXT NOT NULL,
ADD COLUMN     "shipped_at" TIMESTAMP(3),
ALTER COLUMN "boxes_count" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "order_shipping_info" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "recipient_name" VARCHAR(40) NOT NULL,
    "recipient_last_name" VARCHAR(60) NOT NULL,
    "country" VARCHAR(40) NOT NULL,
    "state" VARCHAR(40) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "locality" VARCHAR(50) NOT NULL,
    "street_name" VARCHAR(60) NOT NULL,
    "neighborhood" VARCHAR(60) NOT NULL,
    "zip_code" VARCHAR(10) NOT NULL,
    "address_type" VARCHAR(30) NOT NULL,
    "floor" VARCHAR(3),
    "number" VARCHAR(10) NOT NULL,
    "aditional_number" VARCHAR(10),
    "references_or_comments" VARCHAR(80),
    "country_phone_code" VARCHAR(4) NOT NULL,
    "contact_number" VARCHAR(15) NOT NULL,

    CONSTRAINT "order_shipping_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_shipping_info_order_id_key" ON "order_shipping_info"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_order_shipping_info_id_key" ON "shipping"("order_shipping_info_id");

-- AddForeignKey
ALTER TABLE "order_shipping_info" ADD CONSTRAINT "order_shipping_info_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping" ADD CONSTRAINT "shipping_order_shipping_info_id_fkey" FOREIGN KEY ("order_shipping_info_id") REFERENCES "order_shipping_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
