-- AlterTable
ALTER TABLE "shopping_cart" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "shopping_cart_items" ADD COLUMN     "snapshot_json" JSONB;
