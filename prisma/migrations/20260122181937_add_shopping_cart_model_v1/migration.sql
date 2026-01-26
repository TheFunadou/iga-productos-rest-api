-- CreateEnum
CREATE TYPE "ShoppingCartStatus" AS ENUM ('ACTIVE', 'ABANDONED', 'CONVERTED');

-- CreateTable
CREATE TABLE "ShoppingCart" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" TEXT NOT NULL,
    "status" "ShoppingCartStatus" NOT NULL DEFAULT 'ACTIVE',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingCartItems" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "shopping_cart_id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_checked" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingCartItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingCartItems_uuid_key" ON "ShoppingCartItems"("uuid");

-- AddForeignKey
ALTER TABLE "ShoppingCart" ADD CONSTRAINT "ShoppingCart_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingCartItems" ADD CONSTRAINT "ShoppingCartItems_shopping_cart_id_fkey" FOREIGN KEY ("shopping_cart_id") REFERENCES "ShoppingCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingCartItems" ADD CONSTRAINT "ShoppingCartItems_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "ProductVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
