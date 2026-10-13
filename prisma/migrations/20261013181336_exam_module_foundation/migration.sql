-- CreateEnum
CREATE TYPE "public"."ExamKind" AS ENUM ('INTERNAL', 'END_SEMESTER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Role" ADD VALUE 'COE';
ALTER TYPE "public"."Role" ADD VALUE 'COE_STAFF';

-- DropForeignKey
ALTER TABLE "public"."Exam" DROP CONSTRAINT "Exam_departmentId_fkey";

-- AlterTable
ALTER TABLE "public"."Exam" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "kind" "public"."ExamKind" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "publishedById" TEXT,
ADD COLUMN     "session" TEXT,
ALTER COLUMN "departmentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Exam_departmentId_semester_idx" ON "public"."Exam"("departmentId", "semester");

-- CreateIndex
CREATE INDEX "Exam_kind_idx" ON "public"."Exam"("kind");

-- AddForeignKey
ALTER TABLE "public"."Exam" ADD CONSTRAINT "Exam_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Exam" ADD CONSTRAINT "Exam_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Exam" ADD CONSTRAINT "Exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
