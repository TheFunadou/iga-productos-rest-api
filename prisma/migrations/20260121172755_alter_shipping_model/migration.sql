/*
  Warnings:

  - Added the required column `concept` to the `Shipping` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shipping" ADD COLUMN     "concept" TEXT NOT NULL;
