/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerAddresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerFavorites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OfferTarget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Offers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItemsDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderPaymentDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductResources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductSubcategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVersionImages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVersionReviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Shipping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShoppingCart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShoppingCartItems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subcategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserLogs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserPermissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `customerAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `customerSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CustomerAddresses" DROP CONSTRAINT "CustomerAddresses_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "CustomerFavorites" DROP CONSTRAINT "CustomerFavorites_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "CustomerFavorites" DROP CONSTRAINT "CustomerFavorites_product_version_id_fkey";

-- DropForeignKey
ALTER TABLE "OfferTarget" DROP CONSTRAINT "OfferTarget_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customer_address_id_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "OrderItemsDetails" DROP CONSTRAINT "OrderItemsDetails_order_id_fkey";

-- DropForeignKey
ALTER TABLE "OrderItemsDetails" DROP CONSTRAINT "OrderItemsDetails_product_version_id_fkey";

-- DropForeignKey
ALTER TABLE "OrderPaymentDetails" DROP CONSTRAINT "OrderPaymentDetails_order_id_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductResources" DROP CONSTRAINT "ProductResources_product_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductSubcategories" DROP CONSTRAINT "ProductSubcategories_product_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductSubcategories" DROP CONSTRAINT "ProductSubcategories_subcategory_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductVersion" DROP CONSTRAINT "ProductVersion_product_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductVersionImages" DROP CONSTRAINT "ProductVersionImages_product_version_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductVersionReviews" DROP CONSTRAINT "ProductVersionReviews_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductVersionReviews" DROP CONSTRAINT "ProductVersionReviews_product_version_id_fkey";

-- DropForeignKey
ALTER TABLE "Shipping" DROP CONSTRAINT "Shipping_order_id_fkey";

-- DropForeignKey
ALTER TABLE "ShoppingCart" DROP CONSTRAINT "ShoppingCart_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "ShoppingCartItems" DROP CONSTRAINT "ShoppingCartItems_product_version_id_fkey";

-- DropForeignKey
ALTER TABLE "ShoppingCartItems" DROP CONSTRAINT "ShoppingCartItems_shopping_cart_id_fkey";

-- DropForeignKey
ALTER TABLE "Subcategories" DROP CONSTRAINT "Subcategories_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Subcategories" DROP CONSTRAINT "Subcategories_father_id_fkey";

-- DropForeignKey
ALTER TABLE "UserLogs" DROP CONSTRAINT "UserLogs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserPermissions" DROP CONSTRAINT "UserPermissions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "customerAccount" DROP CONSTRAINT "customerAccount_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "customerSession" DROP CONSTRAINT "customerSession_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "userAccount" DROP CONSTRAINT "userAccount_user_id_fkey";

-- DropForeignKey
ALTER TABLE "userSession" DROP CONSTRAINT "userSession_user_id_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "CustomerAddresses";

-- DropTable
DROP TABLE "CustomerFavorites";

-- DropTable
DROP TABLE "OfferTarget";

-- DropTable
DROP TABLE "Offers";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "OrderItemsDetails";

-- DropTable
DROP TABLE "OrderPaymentDetails";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "ProductResources";

-- DropTable
DROP TABLE "ProductSubcategories";

-- DropTable
DROP TABLE "ProductVersion";

-- DropTable
DROP TABLE "ProductVersionImages";

-- DropTable
DROP TABLE "ProductVersionReviews";

-- DropTable
DROP TABLE "Shipping";

-- DropTable
DROP TABLE "ShoppingCart";

-- DropTable
DROP TABLE "ShoppingCartItems";

-- DropTable
DROP TABLE "Subcategories";

-- DropTable
DROP TABLE "UserLogs";

-- DropTable
DROP TABLE "UserPermissions";

-- DropTable
DROP TABLE "customerAccount";

-- DropTable
DROP TABLE "customerSession";

-- DropTable
DROP TABLE "userAccount";

-- DropTable
DROP TABLE "userSession";

-- CreateTable
CREATE TABLE "user_session" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_account" (
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

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module" "UserModules" NOT NULL,
    "permissions" "Permission"[],
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_session" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "customer_id" TEXT NOT NULL,

    CONSTRAINT "customer_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_account" (
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

    CONSTRAINT "customer_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "father_id" TEXT,
    "father_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_resources" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "resource_description" TEXT NOT NULL,
    "resource_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_subcategories" (
    "product_id" TEXT NOT NULL,
    "subcategory_id" TEXT NOT NULL,

    CONSTRAINT "product_subcategories_pkey" PRIMARY KEY ("product_id","subcategory_id")
);

-- CreateTable
CREATE TABLE "product" (
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

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_version" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "code_bar" TEXT,
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

    CONSTRAINT "product_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_version_images" (
    "id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "main_image" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_version_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_favorites" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
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

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "external_order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_address_id" TEXT,
    "is_guest_order" BOOLEAN NOT NULL DEFAULT false,
    "payment_provider" TEXT NOT NULL,
    "status" "OrderAndPaymentStatus" NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "exchange" TEXT NOT NULL,
    "aditional_resource_url" TEXT,
    "coupon_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_payment_details" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" BIGINT NOT NULL,
    "last_four_digits" TEXT NOT NULL,
    "payment_class" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "customer_paid_amount" DECIMAL(10,2) NOT NULL,
    "received_amount" DECIMAL(10,2) NOT NULL,
    "fee_amount" DECIMAL(10,2),
    "customer_installment_amount" DECIMAL(10,2) NOT NULL,
    "installments" INTEGER NOT NULL,
    "payment_status" "OrderAndPaymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_payment_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items_details" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "order_id" TEXT NOT NULL,
    "shipping_status" "ShippingStatus" NOT NULL,
    "concept" TEXT NOT NULL,
    "tracking_number" TEXT,
    "carrier" TEXT,
    "shipping_amount" DECIMAL(10,2) NOT NULL,
    "insurance_amount" DECIMAL(10,2),
    "boxes_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount_percentage" INTEGER NOT NULL,
    "code" TEXT,
    "type" "OfferType" NOT NULL,
    "status" "OfferStatus" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_target" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "target_type" "OfferTargetType" NOT NULL,
    "target_id" TEXT,
    "target_uuid_path" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "offer_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_version_reviews" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_version_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_cart" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" TEXT NOT NULL,
    "status" "ShoppingCartStatus" NOT NULL DEFAULT 'ACTIVE',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_cart_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "uuid" TEXT NOT NULL,
    "shopping_cart_id" TEXT NOT NULL,
    "product_version_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_checked" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_session_token_key" ON "user_session"("token");

-- CreateIndex
CREATE INDEX "user_session_user_id_idx" ON "user_session"("user_id");

-- CreateIndex
CREATE INDEX "user_session_expires_at_idx" ON "user_session"("expires_at");

-- CreateIndex
CREATE INDEX "user_account_user_id_idx" ON "user_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_provider_id_account_id_key" ON "user_account"("provider_id", "account_id");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- CreateIndex
CREATE INDEX "user_permissions_module_idx" ON "user_permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_module_key" ON "user_permissions"("user_id", "module");

-- CreateIndex
CREATE INDEX "user_logs_user_id_idx" ON "user_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_logs_created_at_idx" ON "user_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_uuid_key" ON "customer"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "customer_email_key" ON "customer"("email");

-- CreateIndex
CREATE INDEX "customer_email_idx" ON "customer"("email");

-- CreateIndex
CREATE INDEX "customer_created_at_idx" ON "customer"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_session_token_key" ON "customer_session"("token");

-- CreateIndex
CREATE INDEX "customer_session_customer_id_idx" ON "customer_session"("customer_id");

-- CreateIndex
CREATE INDEX "customer_session_expires_at_idx" ON "customer_session"("expires_at");

-- CreateIndex
CREATE INDEX "customer_account_customer_id_idx" ON "customer_account"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_account_provider_id_account_id_key" ON "customer_account"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_uuid_key" ON "category"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- CreateIndex
CREATE INDEX "category_name_idx" ON "category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_uuid_key" ON "subcategories"("uuid");

-- CreateIndex
CREATE INDEX "subcategories_category_id_idx" ON "subcategories"("category_id");

-- CreateIndex
CREATE INDEX "subcategories_father_id_idx" ON "subcategories"("father_id");

-- CreateIndex
CREATE INDEX "subcategories_level_idx" ON "subcategories"("level");

-- CreateIndex
CREATE INDEX "product_resources_product_id_idx" ON "product_resources"("product_id");

-- CreateIndex
CREATE INDEX "product_subcategories_subcategory_id_idx" ON "product_subcategories"("subcategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_uuid_key" ON "product"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "product_product_name_key" ON "product"("product_name");

-- CreateIndex
CREATE INDEX "product_category_id_idx" ON "product"("category_id");

-- CreateIndex
CREATE INDEX "product_user_id_idx" ON "product"("user_id");

-- CreateIndex
CREATE INDEX "product_created_at_idx" ON "product"("created_at");

-- CreateIndex
CREATE INDEX "product_product_name_idx" ON "product"("product_name");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_sku_key" ON "product_version"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_code_bar_key" ON "product_version"("code_bar");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_technical_sheet_url_key" ON "product_version"("technical_sheet_url");

-- CreateIndex
CREATE INDEX "product_version_product_id_idx" ON "product_version"("product_id");

-- CreateIndex
CREATE INDEX "product_version_status_idx" ON "product_version"("status");

-- CreateIndex
CREATE INDEX "product_version_stock_idx" ON "product_version"("stock");

-- CreateIndex
CREATE INDEX "product_version_main_version_idx" ON "product_version"("main_version");

-- CreateIndex
CREATE INDEX "product_version_images_product_version_id_idx" ON "product_version_images"("product_version_id");

-- CreateIndex
CREATE INDEX "product_version_images_main_image_idx" ON "product_version_images"("main_image");

-- CreateIndex
CREATE INDEX "customer_favorites_customer_id_idx" ON "customer_favorites"("customer_id");

-- CreateIndex
CREATE INDEX "customer_favorites_product_version_id_idx" ON "customer_favorites"("product_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorites_customer_id_product_version_id_key" ON "customer_favorites"("customer_id", "product_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_uuid_key" ON "customer_addresses"("uuid");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE INDEX "customer_addresses_default_address_idx" ON "customer_addresses"("default_address");

-- CreateIndex
CREATE UNIQUE INDEX "order_uuid_key" ON "order"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "order_external_order_id_key" ON "order"("external_order_id");

-- CreateIndex
CREATE INDEX "order_customer_id_idx" ON "order"("customer_id");

-- CreateIndex
CREATE INDEX "order_status_idx" ON "order"("status");

-- CreateIndex
CREATE INDEX "order_created_at_idx" ON "order"("created_at");

-- CreateIndex
CREATE INDEX "order_payment_provider_idx" ON "order"("payment_provider");

-- CreateIndex
CREATE INDEX "order_coupon_code_idx" ON "order"("coupon_code");

-- CreateIndex
CREATE UNIQUE INDEX "order_payment_details_payment_id_key" ON "order_payment_details"("payment_id");

-- CreateIndex
CREATE INDEX "order_payment_details_order_id_idx" ON "order_payment_details"("order_id");

-- CreateIndex
CREATE INDEX "order_payment_details_payment_status_idx" ON "order_payment_details"("payment_status");

-- CreateIndex
CREATE INDEX "order_payment_details_payment_method_idx" ON "order_payment_details"("payment_method");

-- CreateIndex
CREATE INDEX "order_items_details_order_id_idx" ON "order_items_details"("order_id");

-- CreateIndex
CREATE INDEX "order_items_details_product_version_id_idx" ON "order_items_details"("product_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_uuid_key" ON "shipping"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_order_id_key" ON "shipping"("order_id");

-- CreateIndex
CREATE INDEX "shipping_shipping_status_idx" ON "shipping"("shipping_status");

-- CreateIndex
CREATE INDEX "shipping_tracking_number_idx" ON "shipping"("tracking_number");

-- CreateIndex
CREATE INDEX "shipping_carrier_idx" ON "shipping"("carrier");

-- CreateIndex
CREATE UNIQUE INDEX "offers_uuid_key" ON "offers"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "offers_code_key" ON "offers"("code");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE INDEX "offers_type_idx" ON "offers"("type");

-- CreateIndex
CREATE INDEX "offers_start_date_end_date_idx" ON "offers"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "offers_code_idx" ON "offers"("code");

-- CreateIndex
CREATE INDEX "offer_target_target_type_target_id_idx" ON "offer_target"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "offer_target_offer_id_idx" ON "offer_target"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_target_offer_id_target_type_target_id_key" ON "offer_target"("offer_id", "target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_reviews_uuid_key" ON "product_version_reviews"("uuid");

-- CreateIndex
CREATE INDEX "product_version_reviews_product_version_id_idx" ON "product_version_reviews"("product_version_id");

-- CreateIndex
CREATE INDEX "product_version_reviews_customer_id_idx" ON "product_version_reviews"("customer_id");

-- CreateIndex
CREATE INDEX "product_version_reviews_rating_idx" ON "product_version_reviews"("rating");

-- CreateIndex
CREATE INDEX "product_version_reviews_created_at_idx" ON "product_version_reviews"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_version_reviews_product_version_id_customer_id_key" ON "product_version_reviews"("product_version_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_cart_customer_id_key" ON "shopping_cart"("customer_id");

-- CreateIndex
CREATE INDEX "shopping_cart_status_idx" ON "shopping_cart"("status");

-- CreateIndex
CREATE INDEX "shopping_cart_updated_at_idx" ON "shopping_cart"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_cart_items_uuid_key" ON "shopping_cart_items"("uuid");

-- CreateIndex
CREATE INDEX "shopping_cart_items_shopping_cart_id_idx" ON "shopping_cart_items"("shopping_cart_id");

-- CreateIndex
CREATE INDEX "shopping_cart_items_product_version_id_idx" ON "shopping_cart_items"("product_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_cart_items_shopping_cart_id_product_version_id_key" ON "shopping_cart_items"("shopping_cart_id", "product_version_id");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE INDEX "user_created_at_idx" ON "user"("created_at");

-- CreateIndex
CREATE INDEX "verification_expires_at_idx" ON "verification"("expires_at");

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_logs" ADD CONSTRAINT "user_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_session" ADD CONSTRAINT "customer_session_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_account" ADD CONSTRAINT "customer_account_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_father_id_fkey" FOREIGN KEY ("father_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_resources" ADD CONSTRAINT "product_resources_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_version" ADD CONSTRAINT "product_version_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_version_images" ADD CONSTRAINT "product_version_images_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payment_details" ADD CONSTRAINT "order_payment_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items_details" ADD CONSTRAINT "order_items_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items_details" ADD CONSTRAINT "order_items_details_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping" ADD CONSTRAINT "shipping_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_target" ADD CONSTRAINT "offer_target_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_version_reviews" ADD CONSTRAINT "product_version_reviews_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_version_reviews" ADD CONSTRAINT "product_version_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_cart" ADD CONSTRAINT "shopping_cart_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_cart_items" ADD CONSTRAINT "shopping_cart_items_shopping_cart_id_fkey" FOREIGN KEY ("shopping_cart_id") REFERENCES "shopping_cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_cart_items" ADD CONSTRAINT "shopping_cart_items_product_version_id_fkey" FOREIGN KEY ("product_version_id") REFERENCES "product_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
