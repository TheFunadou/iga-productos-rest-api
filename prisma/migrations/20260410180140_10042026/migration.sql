-- CreateEnum
CREATE TYPE "OfferStackGroup" AS ENUM ('BASE', 'COUPON', 'SHIPPING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OfferStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "OfferStatus" ADD VALUE 'FINISHED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OfferTargetType" ADD VALUE 'COMBINATIONS';
ALTER TYPE "OfferTargetType" ADD VALUE 'SHIPPING';

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "is_exclusive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_purchase_amount" DECIMAL(10,2),
ADD COLUMN     "max_stack" INTEGER DEFAULT 1,
ADD COLUMN     "min_purchase_amount" DECIMAL(10,2),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stack_group" "OfferStackGroup" NOT NULL DEFAULT 'BASE';
