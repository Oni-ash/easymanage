/*
  Warnings:

  - A unique constraint covering the columns `[slotId]` on the table `AppointmentRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."AppointmentRequest" ADD COLUMN     "slotId" TEXT;

-- CreateTable
CREATE TABLE "public"."AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilitySlot_staffId_startAt_idx" ON "public"."AvailabilitySlot"("staffId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentRequest_slotId_key" ON "public"."AppointmentRequest"("slotId");

-- AddForeignKey
ALTER TABLE "public"."AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "public"."AvailabilitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
