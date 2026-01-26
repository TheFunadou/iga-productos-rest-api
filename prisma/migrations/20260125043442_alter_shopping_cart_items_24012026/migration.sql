/*
  Warnings:

  - A unique constraint covering the columns `[shopping_cart_id,product_version_id]` on the table `ShoppingCartItems` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ShoppingCartItems_shopping_cart_id_product_version_id_key" ON "ShoppingCartItems"("shopping_cart_id", "product_version_id");
