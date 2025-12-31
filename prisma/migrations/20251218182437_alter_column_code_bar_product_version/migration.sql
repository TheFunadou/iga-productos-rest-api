/*
  Warnings:

  - You are about to drop the column `codeBar` on the `ProductVersion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code_bar]` on the table `ProductVersion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProductVersion_codeBar_key";

-- AlterTable
ALTER TABLE "ProductVersion" DROP COLUMN "codeBar",
ADD COLUMN     "code_bar" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_code_bar_key" ON "ProductVersion"("code_bar");
