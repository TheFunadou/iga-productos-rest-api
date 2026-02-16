/*
  Warnings:

  - You are about to drop the column `description` on the `user_logs` table. All the data in the column will be lost.
  - Added the required column `action` to the `user_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity` to the `user_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity_id` to the `user_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_logs" DROP CONSTRAINT "user_logs_user_id_fkey";

-- AlterTable
ALTER TABLE "user_logs" DROP COLUMN "description",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "entity" TEXT NOT NULL,
ADD COLUMN     "entity_id" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "user_logs" ADD CONSTRAINT "user_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
