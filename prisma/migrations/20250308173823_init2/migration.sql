/*
  Warnings:

  - Added the required column `status` to the `EndUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EndUser" ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
