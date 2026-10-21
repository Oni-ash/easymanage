'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function createSubject(input: {
  code: string;
  name: string;
  semester: number;
  hasPractical: boolean;
  departmentId: string | null;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only HOD or admin can manage subjects' };
  }

  const departmentId =
    principal.role === 'ADMIN' ? input.departmentId : principal.departmentId;
  if (!departmentId) return { error: 'No department specified' };

  if (!input.code || input.code.length < 2) return { error: 'Code is too short' };
  if (!input.name || input.name.length < 2) return { error: 'Name is too short' };
  if (input.semester < 1 || input.semester > 8) {
    return { error: 'Semester must be between 1 and 8' };
  }

  // Check uniqueness within the department + semester + code
  const existing = await prisma.subject.findFirst({
    where: { departmentId, code: input.code, semester: input.semester },
    select: { id: true },
  });
  if (existing) {
    return { error: `Subject code ${input.code} already exists for semester ${input.semester}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.subject.create({
      data: {
        departmentId,
        code: input.code,
        name: input.name,
        semester: input.semester,
        hasPractical: input.hasPractical,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'SUBJECT_CREATED',
        entity: 'Subject',
        entityId: `${departmentId}:${input.code}:${input.semester}`,
        meta: { code: input.code, name: input.name, semester: input.semester },
      },
    });
  });

  revalidatePath('/setup/subjects');
  return { ok: true };
}