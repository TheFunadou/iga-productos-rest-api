-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customer_address_id_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "is_guest_order" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "customer_address_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "CustomerAddresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
