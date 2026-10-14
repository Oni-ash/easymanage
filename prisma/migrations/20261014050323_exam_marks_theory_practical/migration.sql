/*
  Warnings:

  - You are about to drop the column `marksObtained` on the `ExamMark` table. All the data in the column will be lost.
  - You are about to drop the column `maxMarks` on the `ExamMark` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ExamMark" DROP COLUMN "marksObtained",
DROP COLUMN "maxMarks",
ADD COLUMN     "maxPractical" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "maxTheory" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "practicalMarks" INTEGER,
ADD COLUMN     "theoryMarks" INTEGER;

-- AlterTable
ALTER TABLE "public"."Subject" ADD COLUMN     "hasPractical" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ExamMark_studentId_idx" ON "public"."ExamMark"("studentId");
