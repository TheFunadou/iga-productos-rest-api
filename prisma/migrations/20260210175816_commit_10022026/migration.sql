/*
  Warnings:

  - You are about to drop the `product_version_reviews` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_version_reviews" DROP CONSTRAINT "product_version_reviews_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "product_version_reviews" DROP CONSTRAINT "product_version_reviews_product_version_id_fkey";

-- DropTable
DROP TABLE "product_version_reviews";

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_uuid_key" ON "product_reviews"("uuid");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_idx" ON "product_reviews"("product_id");

-- CreateIndex
CREATE INDEX "product_reviews_product_version_id_idx" ON "product_reviews"("product_version_id");

-- CreateIndex
CREATE INDEX "product_reviews_customer_id_product_version_id_idx" ON "product_reviews"("customer_id", "product_version_id");

-- CreateIndex
CREATE INDEX "product_reviews_customer_id_idx" ON "product_reviews"("customer_id");

-- CreateIndex
CREATE INDEX "product_reviews_rating_idx" ON "product_reviews"("rating");

-- CreateIndex
CREATE INDEX "product_reviews_created_at_idx" ON "product_reviews"("created_at");

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
