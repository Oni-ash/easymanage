'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

// ─────────────────────── Slot management ────────────────────

export async function createSlot(input: {
  startAt: string;
  endAt: string;
  location: string | null;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role === 'STUDENT') return { error: 'Students cannot create slots' };

  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: 'Invalid dates' };
  }
  if (end <= start) return { error: 'End must be after start' };
  if (start < new Date()) return { error: 'Slot must be in the future' };

  await prisma.availabilitySlot.create({
    data: {
      staffId: principal.id,
      startAt: start,
      endAt: end,
      location: input.location,
    },
  });

  revalidatePath('/appointments');
  return { ok: true };
}

export async function deleteSlot(slotId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    select: { staffId: true, isBooked: true },
  });
  if (!slot) return { error: 'Slot not found' };
  if (slot.staffId !== principal.id) return { error: 'Not your slot' };
  if (slot.isBooked) return { error: 'Slot is booked. Reject the request first.' };

  await prisma.availabilitySlot.delete({ where: { id: slotId } });

  revalidatePath('/appointments');
  return { ok: true };
}

// ─────────────────────── Decisions ──────────────────────────

export async function approveAppointment(requestId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const request = await prisma.appointmentRequest.findUnique({
    where: { id: requestId },
    include: { slot: { select: { startAt: true, location: true } } },
  });
  if (!request) return { error: 'Request not found' };
  if (request.staffId !== principal.id) return { error: 'Not your request' };
  if (request.status !== 'PENDING') return { error: 'Already decided' };
  if (!request.slot) return { error: 'Request has no slot' };

  await prisma.$transaction(async (tx) => {
    await tx.appointmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'SCHEDULED',
        scheduledAt: request.slot!.startAt,
        location: request.slot!.location,
      },
    });

    await tx.notification.create({
      data: {
        userId: request.studentId,
        title: 'Appointment confirmed',
        body: `Scheduled for ${request.slot!.startAt.toLocaleString()}.`,
        link: '/appointments',
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'APPOINTMENT_APPROVED',
        entity: 'AppointmentRequest',
        entityId: requestId,
      },
    });
  });

  revalidatePath('/appointments');
  return { ok: true };
}

export async function rejectAppointment(
  requestId: string,
  reason: string,
): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (reason.trim().length < 5) return { error: 'Please provide a reason' };

  const request = await prisma.appointmentRequest.findUnique({
    where: { id: requestId },
    select: { staffId: true, status: true, slotId: true, studentId: true },
  });
  if (!request) return { error: 'Request not found' };
  if (request.staffId !== principal.id) return { error: 'Not your request' };
  if (request.status !== 'PENDING') return { error: 'Already decided' };

  await prisma.$transaction(async (tx) => {
    await tx.appointmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
      },
    });

    // Free the slot so someone else can book it
    if (request.slotId) {
      await tx.availabilitySlot.update({
        where: { id: request.slotId },
        data: { isBooked: false },
      });
    }

    await tx.notification.create({
      data: {
        userId: request.studentId,
        title: 'Appointment request declined',
        body: `Reason: ${reason.trim()}`,
        link: '/appointments',
      },
    });
  });

  revalidatePath('/appointments');
  return { ok: true };
}