/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `shipping` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "OrderAndPaymentStatus" ADD VALUE 'ABANDONED';

-- AlterTable
ALTER TABLE "shipping" ADD COLUMN     "uuid" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "shipping_uuid_key" ON "shipping"("uuid");
