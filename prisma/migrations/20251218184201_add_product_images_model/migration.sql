-- CreateTable
CREATE TABLE "ProductVersionImages" (
    "id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "main_image" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductVersionImages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductVersionImages" ADD CONSTRAINT "ProductVersionImages_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "ProductVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
