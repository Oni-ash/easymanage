'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function createClass(input: {
  name: string;
  semester: number;
  departmentId: string | null;
  inchargeId: string | null;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only HOD or admin can create classes' };
  }

  const departmentId =
    principal.role === 'ADMIN' ? input.departmentId : principal.departmentId;
  if (!departmentId) return { error: 'No department specified' };
  if (!input.name || input.name.length < 2) return { error: 'Class name is too short' };
  if (input.semester < 1 || input.semester > 8) {
    return { error: 'Semester must be 1–8' };
  }

  // Check uniqueness
  const existing = await prisma.class.findFirst({
    where: { departmentId, name: input.name },
    select: { id: true },
  });
  if (existing) {
    return { error: `A class called ${input.name} already exists in this department` };
  }

  // Validate incharge belongs to same dept
  if (input.inchargeId) {
    const fac = await prisma.user.findUnique({
      where: { id: input.inchargeId },
      select: { role: true, departmentId: true, active: true },
    });
    if (!fac || fac.role !== 'FACULTY' || !fac.active) {
      return { error: 'Invalid incharge' };
    }
    if (fac.departmentId !== departmentId) {
      return { error: 'Incharge must be in the same department' };
    }
  }

  await prisma.$transaction(async (tx) => {
    const cls = await tx.class.create({
      data: {
        name: input.name,
        semester: input.semester,
        departmentId,
        inchargeId: input.inchargeId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'CLASS_CREATED',
        entity: 'Class',
        entityId: cls.id,
        meta: { name: input.name, semester: input.semester },
      },
    });
  });

  revalidatePath('/setup/classes');
  return { ok: true };
}

export async function deleteClass(classId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only HOD or admin can delete classes' };
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      _count: { select: { students: true } },
    },
  });
  if (!cls) return { error: 'Class not found' };

  if (principal.role === 'HOD' && cls.departmentId !== principal.departmentId) {
    return { error: 'This class is not in your department' };
  }

  if (cls._count.students > 0) {
    return {
      error: `Cannot delete: ${cls._count.students} student${cls._count.students === 1 ? '' : 's'} still in this class. Reassign them first.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.class.delete({ where: { id: classId } });
    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'CLASS_DELETED',
        entity: 'Class',
        entityId: classId,
        meta: { name: cls.name },
      },
    });
  });

  revalidatePath('/setup/classes');
  return { ok: true };
}