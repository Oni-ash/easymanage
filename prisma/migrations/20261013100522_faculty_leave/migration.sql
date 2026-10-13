/*
  Warnings:

  - You are about to drop the column `studentId` on the `LeaveRequest` table. All the data in the column will be lost.
  - Added the required column `requesterId` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."LeaveRequest" DROP CONSTRAINT "LeaveRequest_classId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LeaveRequest" DROP CONSTRAINT "LeaveRequest_studentId_fkey";

-- DropIndex
DROP INDEX "public"."LeaveRequest_status_classId_idx";

-- AlterTable
ALTER TABLE "public"."LeaveRequest" DROP COLUMN "studentId",
ADD COLUMN     "requesterId" TEXT NOT NULL,
ALTER COLUMN "classId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "public"."LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_requesterId_idx" ON "public"."LeaveRequest"("requesterId");

-- CreateIndex
CREATE INDEX "LeaveRequest_classId_idx" ON "public"."LeaveRequest"("classId");

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
