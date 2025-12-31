-- CreateEnum
CREATE TYPE "UserModules" AS ENUM ('USERS', 'CATEGORIES', 'SUBCATEGORIES', 'PRODUCTS', 'CUSTOMERS', 'ORDERS', 'E_COMMERCE_PAGE');

-- CreateEnum
CREATE TYPE "UserRoles" AS ENUM ('SUPERUSER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('PERCENTAGE', 'COUPON');

-- CreateEnum
CREATE TYPE "OfferTargetType" AS ENUM ('PRODUCT', 'CATEGORY', 'SUBCATEGORY', 'PRODUCT_VERSION');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "UserRoles" NOT NULL DEFAULT 'STAFF',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userSession" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "userSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userAccount" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module" "UserModules" NOT NULL,
    "permissions" "Permission"[],
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLogs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "customerSession" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "customer_id" TEXT NOT NULL,

    CONSTRAINT "customerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customerAccount" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategories" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "father_id" TEXT,
    "father_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSources" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "source_description" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSubcategories" (
    "product_id" TEXT NOT NULL,
    "subcategory_id" TEXT NOT NULL,

    CONSTRAINT "ProductSubcategories_pkey" PRIMARY KEY ("product_id","subcategory_id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specs" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "applications" TEXT NOT NULL,
    "certifications_desc" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVersion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "codeBar" TEXT NOT NULL,
    "color_line" TEXT NOT NULL,
    "color_name" TEXT NOT NULL,
    "color_code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "technical_sheet_url" TEXT NOT NULL DEFAULT 'N/A',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "main_version" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFavorites" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFavorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddresses" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
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
    "floor" VARCHAR(3) DEFAULT 'N/A',
    "number" VARCHAR(10) NOT NULL,
    "aditional_number" VARCHAR(10) DEFAULT 'N/A',
    "references_or_comments" VARCHAR(80) DEFAULT 'N/A',
    "country_phone_code" VARCHAR(4) NOT NULL,
    "contact_number" VARCHAR(15) NOT NULL,
    "default_address" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "external_order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_address_id" TEXT NOT NULL,
    "payment_provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "exchange" TEXT NOT NULL,
    "aditional_source_url" TEXT,
    "coupon_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPaymentDetails" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_class" TEXT NOT NULL,
    "payment_method" TEXT,
    "installments" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPaymentDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemsDetails" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItemsDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipping" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "order_id" TEXT NOT NULL,
    "shipping_status" TEXT NOT NULL,
    "tracking_number" TEXT,
    "carrier" TEXT,
    "shipping_amount" DECIMAL(10,2) NOT NULL,
    "insurance_amount" DECIMAL(10,2) NOT NULL,
    "boxes_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offers" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount_percentage" INTEGER NOT NULL,
    "type" "OfferType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferTarget" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "target_type" "OfferTargetType" NOT NULL,
    "target_id" TEXT,
    "target_uuid_path" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "OfferTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_uuid_key" ON "user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "userSession_token_key" ON "userSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "userAccount_provider_id_account_id_key" ON "userAccount"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_value_key" ON "verification"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_id_key" ON "Customer"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_uuid_key" ON "Customer"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customerSession_token_key" ON "customerSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "customerAccount_provider_id_account_id_key" ON "customerAccount"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Category_uuid_key" ON "Category"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategories_uuid_key" ON "Subcategories"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Product_uuid_key" ON "Product"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Product_product_name_key" ON "Product"("product_name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_sku_key" ON "ProductVersion"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_codeBar_key" ON "ProductVersion"("codeBar");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_technical_sheet_url_key" ON "ProductVersion"("technical_sheet_url");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAddresses_uuid_key" ON "CustomerAddresses"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Order_uuid_key" ON "Order"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Order_external_order_id_key" ON "Order"("external_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "Shipping_uuid_key" ON "Shipping"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Offers_uuid_key" ON "Offers"("uuid");

-- CreateIndex
CREATE INDEX "OfferTarget_target_type_target_id_idx" ON "OfferTarget"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "OfferTarget_offer_id_target_type_target_id_key" ON "OfferTarget"("offer_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "userSession" ADD CONSTRAINT "userSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userAccount" ADD CONSTRAINT "userAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissions" ADD CONSTRAINT "UserPermissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogs" ADD CONSTRAINT "UserLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customerSession" ADD CONSTRAINT "customerSession_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customerAccount" ADD CONSTRAINT "customerAccount_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategories" ADD CONSTRAINT "Subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategories" ADD CONSTRAINT "Subcategories_father_id_fkey" FOREIGN KEY ("father_id") REFERENCES "Subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSources" ADD CONSTRAINT "ProductSources_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubcategories" ADD CONSTRAINT "ProductSubcategories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubcategories" ADD CONSTRAINT "ProductSubcategories_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "Subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFavorites" ADD CONSTRAINT "CustomerFavorites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFavorites" ADD CONSTRAINT "CustomerFavorites_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "ProductVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddresses" ADD CONSTRAINT "CustomerAddresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "CustomerAddresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPaymentDetails" ADD CONSTRAINT "OrderPaymentDetails_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemsDetails" ADD CONSTRAINT "OrderItemsDetails_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemsDetails" ADD CONSTRAINT "OrderItemsDetails_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "ProductVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipping" ADD CONSTRAINT "Shipping_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
