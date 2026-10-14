'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function createEndSemExam(input: {
  name: string;
  session: string;
  semester: number;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'COE' && principal.role !== 'ADMIN') {
    return { error: 'Only the COE can create end-semester exams' };
  }

  const name = input.name.trim();
  const session = input.session.trim() || null;

  if (name.length < 3) return { error: 'Exam name is too short' };
  if (input.semester < 1 || input.semester > 8) {
    return { error: 'Semester must be between 1 and 8' };
  }

  await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({
      data: {
        name,
        kind: 'END_SEMESTER',
        session,
        departmentId: null,
        semester: input.semester,
        createdById: principal.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'END_SEM_EXAM_CREATED',
        entity: 'Exam',
        entityId: exam.id,
        meta: { name, semester: input.semester, session },
      },
    });
  });

  revalidatePath('/results');
  return { ok: true };
}