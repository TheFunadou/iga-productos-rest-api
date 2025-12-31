/*
  Warnings:

  - Added the required column `last_name` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "last_name" TEXT NOT NULL;
