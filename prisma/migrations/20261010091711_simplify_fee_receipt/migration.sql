/*
  Warnings:

  - A unique constraint covering the columns `[receiptNumber]` on the table `FeeTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."FeeTransaction" ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "utr" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FeeTransaction_receiptNumber_key" ON "public"."FeeTransaction"("receiptNumber");
