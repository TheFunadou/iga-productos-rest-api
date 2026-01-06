/*
  Warnings:

  - Added the required column `status` to the `Offers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED', 'PENDING');

-- DropForeignKey
ALTER TABLE "OfferTarget" DROP CONSTRAINT "OfferTarget_offer_id_fkey";

-- AlterTable
ALTER TABLE "Offers" ADD COLUMN     "status" "OfferStatus" NOT NULL;

-- AddForeignKey
ALTER TABLE "OfferTarget" ADD CONSTRAINT "OfferTarget_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
