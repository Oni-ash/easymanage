'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { saveFile, deleteStoredFile } from '@/lib/storage';

type Result = { ok: true } | { error: string };

const ALLOWED_TYPES = new Set([
  'Academic',
  'Facility',
  'Administrative',
  'Harassment',
  'Other',
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function createGrievance(formData: FormData): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'STUDENT') {
    return { error: 'Only students can file grievances' };
  }
  if (!principal.departmentId) {
    return { error: 'You are not assigned to a department' };
  }

  const type = String(formData.get('type') ?? '');
  const details = String(formData.get('details') ?? '').trim();
  const file = formData.get('file');

  if (!ALLOWED_TYPES.has(type)) return { error: 'Invalid grievance type' };
  if (details.length < 20) {
    return { error: 'Please provide more detail (at least 20 characters)' };
  }

  let attachmentKey: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return { error: 'Attachment is larger than 20 MB' };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveFile(file.name, buffer);
    attachmentKey = saved.key;
  }

  try {
    await prisma.grievance.create({
      data: {
        studentId: principal.id,
        departmentId: principal.departmentId,
        type,
        details,
        status: 'PENDING',
        attachmentKey,
      },
    });
  } catch (e) {
    if (attachmentKey) await deleteStoredFile(attachmentKey);
    throw e;
  }

  revalidatePath('/grievance');
  return { ok: true };
}