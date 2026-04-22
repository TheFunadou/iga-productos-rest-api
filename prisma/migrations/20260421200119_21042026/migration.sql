/*
  Warnings:

  - A unique constraint covering the columns `[session_id]` on the table `order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "order" ADD COLUMN     "session_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "order_session_id_key" ON "order"("session_id");
