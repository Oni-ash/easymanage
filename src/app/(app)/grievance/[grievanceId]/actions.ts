'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

async function loadForStaff(grievanceId: string) {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' as const };

  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    select: {
      id: true,
      departmentId: true,
      studentId: true,
      status: true,
    },
  });
  if (!grievance) return { error: 'Grievance not found' as const };

  const isHod =
    (principal.role === 'HOD' || principal.role === 'ADMIN') &&
    (principal.role === 'ADMIN' || principal.departmentId === grievance.departmentId);

  const isFacultyWithPermission =
    principal.role === 'FACULTY' &&
    principal.departmentId === grievance.departmentId &&
    (principal.permissions as string[]).includes('GRIEVANCE');

  if (!isHod && !isFacultyWithPermission) {
    return { error: 'You do not have permission to act on this grievance' as const };
  }

  return { principal, grievance, isHod };
}

export async function updateGrievance(input: {
  grievanceId: string;
  status: string;
  response: string | null;
}): Promise<Result> {
  const ctx = await loadForStaff(input.grievanceId);
  if ('error' in ctx) return ctx;

  if (!['PENDING', 'IN_PROGRESS', 'RESOLVED'].includes(input.status)) {
    return { error: 'Invalid status' };
  }

  const updateData: {
    status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
    response: string | null;
    resolvedAt: Date | null;
  } = {
    status: input.status as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED',
    response: input.response,
    resolvedAt: input.status === 'RESOLVED' ? new Date() : null,
  };

  await prisma.$transaction(async (tx) => {
    await tx.grievance.update({
      where: { id: input.grievanceId },
      data: updateData,
    });

    await tx.auditLog.create({
      data: {
        actorId: ctx.principal.id,
        action: 'GRIEVANCE_UPDATED',
        entity: 'Grievance',
        entityId: input.grievanceId,
        meta: { status: input.status },
      },
    });

    // Notify the student only when status changes or a response is added.
    const statusChanged = ctx.grievance.status !== input.status;
    const responseAdded = !!input.response;
    if (statusChanged || responseAdded) {
      await tx.notification.create({
        data: {
          userId: ctx.grievance.studentId,
          title:
            input.status === 'RESOLVED'
              ? 'Your grievance has been resolved'
              : statusChanged
                ? `Grievance status: ${input.status.toLowerCase()}`
                : 'New response on your grievance',
          body: responseAdded ? input.response!.slice(0, 140) : undefined,
          link: `/grievance/${input.grievanceId}`,
        },
      });
    }
  });

  revalidatePath(`/grievance/${input.grievanceId}`);
  revalidatePath('/grievance');
  return { ok: true };
}

export async function assignGrievance(input: {
  grievanceId: string;
  assignedToId: string | null;
}): Promise<Result> {
  const ctx = await loadForStaff(input.grievanceId);
  if ('error' in ctx) return ctx;

  if (!ctx.isHod) {
    return { error: 'Only the HOD can assign grievances' };
  }

  if (input.assignedToId) {
    const target = await prisma.user.findUnique({
      where: { id: input.assignedToId },
      select: { departmentId: true, role: true, active: true },
    });
    if (
      !target ||
      !target.active ||
      target.departmentId !== ctx.grievance.departmentId ||
      !['FACULTY', 'HOD'].includes(target.role)
    ) {
      return { error: 'Invalid assignee for this department' };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.grievance.update({
      where: { id: input.grievanceId },
      data: { assignedToId: input.assignedToId },
    });

    await tx.auditLog.create({
      data: {
        actorId: ctx.principal.id,
        action: 'GRIEVANCE_ASSIGNED',
        entity: 'Grievance',
        entityId: input.grievanceId,
        meta: { assignedToId: input.assignedToId },
      },
    });

    if (input.assignedToId) {
      await tx.notification.create({
        data: {
          userId: input.assignedToId,
          title: 'A grievance has been assigned to you',
          body: 'Open the grievance section to review.',
          link: `/grievance/${input.grievanceId}`,
        },
      });
    }
  });

  revalidatePath(`/grievance/${input.grievanceId}`);
  revalidatePath('/grievance');
  return { ok: true };
}