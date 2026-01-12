-- CreateTable
CREATE TABLE "ProductVersionReviews" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVersionReviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersionReviews_uuid_key" ON "ProductVersionReviews"("uuid");

-- AddForeignKey
ALTER TABLE "ProductVersionReviews" ADD CONSTRAINT "ProductVersionReviews_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "ProductVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersionReviews" ADD CONSTRAINT "ProductVersionReviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
