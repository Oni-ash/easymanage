'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function createDepartment(input: {
  code: string;
  name: string;
  hodId: string | null;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'ADMIN') return { error: 'Only admin can manage departments' };

  if (!input.code || input.code.length < 2) return { error: 'Code is too short' };
  if (!input.name || input.name.length < 2) return { error: 'Name is too short' };

  const existing = await prisma.department.findFirst({
    where: { OR: [{ code: input.code }, { name: input.name }] },
    select: { code: true, name: true },
  });
  if (existing) {
    if (existing.code === input.code) return { error: `Code ${input.code} is already in use` };
    return { error: `A department called "${input.name}" already exists` };
  }

  // Validate HOD if provided
  if (input.hodId) {
    const hod = await prisma.user.findUnique({
      where: { id: input.hodId },
      select: { role: true, active: true },
    });
    if (!hod || hod.role !== 'HOD' || !hod.active) {
      return { error: 'Selected user is not an active HOD' };
    }
    const already = await prisma.department.findFirst({
      where: { hodId: input.hodId },
      select: { code: true },
    });
    if (already) {
      return { error: `This user is already HOD of ${already.code}` };
    }
  }

  await prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({
      data: {
        code: input.code,
        name: input.name,
        hodId: input.hodId,
      },
    });

    // If HOD assigned, also set their departmentId
    if (input.hodId) {
      await tx.user.update({
        where: { id: input.hodId },
        data: { departmentId: dept.id },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'DEPARTMENT_CREATED',
        entity: 'Department',
        entityId: dept.id,
        meta: { code: input.code, name: input.name, hodId: input.hodId },
      },
    });
  });

  revalidatePath('/setup/departments');
  return { ok: true };
}

export async function deleteDepartment(departmentId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'ADMIN') return { error: 'Only admin can delete departments' };

  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      _count: { select: { members: true, classes: true } },
    },
  });
  if (!dept) return { error: 'Department not found' };

  if (dept._count.members > 0 || dept._count.classes > 0) {
    return {
      error: `Cannot delete: ${dept._count.members} member${dept._count.members === 1 ? '' : 's'} and ${dept._count.classes} class${dept._count.classes === 1 ? '' : 'es'} still reference this department.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    // Break the hodId link if set
    if (dept.hodId) {
      await tx.user.update({
        where: { id: dept.hodId },
        data: { departmentId: null },
      });
    }
    await tx.department.delete({ where: { id: departmentId } });
    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'DEPARTMENT_DELETED',
        entity: 'Department',
        entityId: departmentId,
        meta: { code: dept.code },
      },
    });
  });

  revalidatePath('/setup/departments');
  return { ok: true };
}