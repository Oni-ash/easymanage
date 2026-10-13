'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function requestAppointment(input: {
  staffId: string;
  slotId: string;
  reason: string;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'STUDENT') return { error: 'Only students can request appointments' };

  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: input.slotId },
    select: { id: true, staffId: true, isBooked: true, startAt: true },
  });
  if (!slot) return { error: 'Slot not found' };
  if (slot.staffId !== input.staffId) return { error: 'Slot does not belong to that staff' };
  if (slot.isBooked) return { error: 'That slot has just been taken. Please pick another.' };
  if (slot.startAt < new Date()) return { error: 'That slot is in the past.' };

  if (input.reason.trim().length < 10) {
    return { error: 'Please give a bit more detail in your reason' };
  }

  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to catch the race
    const fresh = await tx.availabilitySlot.findUnique({
      where: { id: input.slotId },
      select: { isBooked: true },
    });
    if (!fresh || fresh.isBooked) throw new Error('SLOT_TAKEN');

    await tx.availabilitySlot.update({
      where: { id: input.slotId },
      data: { isBooked: true },
    });

    await tx.appointmentRequest.create({
      data: {
        studentId: principal.id,
        staffId: input.staffId,
        slotId: input.slotId,
        reason: input.reason.trim(),
        preferredAt: slot.startAt,
        status: 'PENDING',
      },
    });

    await tx.notification.create({
      data: {
        userId: input.staffId,
        title: 'New appointment request',
        body: `${principal.name} requested an appointment.`,
        link: '/appointments',
      },
    });
  });

  revalidatePath('/appointments');
  revalidatePath(`/appointments/book/${input.staffId}`);
  return { ok: true };
}