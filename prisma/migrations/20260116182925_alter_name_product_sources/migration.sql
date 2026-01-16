/*
  Warnings:

  - You are about to drop the column `aditional_source_url` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `ProductSources` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `payment_method` on table `OrderPaymentDetails` required. This step will fail if there are existing NULL values in that column.
  - Made the column `installments` on table `OrderPaymentDetails` required. This step will fail if there are existing NULL values in that column.
  - Made the column `payment_id` on table `OrderPaymentDetails` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ProductSources" DROP CONSTRAINT "ProductSources_product_id_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "aditional_source_url",
ADD COLUMN     "aditional_resource_url" TEXT;

-- AlterTable
ALTER TABLE "OrderPaymentDetails" ALTER COLUMN "payment_method" SET NOT NULL,
ALTER COLUMN "installments" SET NOT NULL,
ALTER COLUMN "payment_id" SET NOT NULL;

-- DropTable
DROP TABLE "ProductSources";

-- CreateTable
CREATE TABLE "ProductResources" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "resource_description" TEXT NOT NULL,
    "resource_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductResources_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductResources" ADD CONSTRAINT "ProductResources_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
