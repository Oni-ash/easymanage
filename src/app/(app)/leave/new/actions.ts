'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

export async function submitLeaveRequest(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'STUDENT') return { error: 'Only students can submit leave requests' };
  if (!principal.classId) return { error: 'You are not assigned to a class' };

  const fromDateStr = String(formData.get('fromDate') ?? '');
  const toDateStr = String(formData.get('toDate') ?? '');
  const body = String(formData.get('body') ?? '').trim();

  if (!fromDateStr || !toDateStr || !body) {
    return { error: 'All fields are required' };
  }
  if (body.length < 10) {
    return { error: 'Please provide a bit more detail in the reason' };
  }

  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  const fromDate = new Date(Date.UTC(fy, fm - 1, fd));
  const toDate = new Date(Date.UTC(ty, tm - 1, td));

  if (fromDate > toDate) {
    return { error: 'From date must be before or equal to the to date' };
  }

  await prisma.leaveRequest.create({
    data: {
      studentId: principal.id,
      classId: principal.classId,
      fromDate,
      toDate,
      body,
      status: 'PENDING',
    },
  });

  revalidatePath('/leave');
  return { ok: true };
}