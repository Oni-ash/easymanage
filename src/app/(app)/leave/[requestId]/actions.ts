'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

async function loadRequestForAction(requestId: string) {
  return prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      student: { select: { id: true, name: true, departmentId: true } },
      class: { select: { inchargeId: true, name: true, departmentId: true } },
    },
  });
}

// ───────────────────────── Incharge actions ─────────────────────────

export async function approveAsIncharge(requestId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const request = await loadRequestForAction(requestId);
  if (!request) return { error: 'Request not found' };
  if (request.class.inchargeId !== principal.id) {
    return { error: 'You are not the class incharge for this request' };
  }
  if (request.status !== 'PENDING') {
    return { error: 'This request is not awaiting your decision' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'PENDING_HOD',
        inchargeId: principal.id,
        inchargeAt: new Date(),
      },
    });

    // Notify the HOD of the student's department
    if (request.student.departmentId) {
      const dept = await tx.department.findUnique({
        where: { id: request.student.departmentId },
        select: { hodId: true, name: true },
      });
      if (dept?.hodId) {
        await tx.notification.create({
          data: {
            userId: dept.hodId,
            title: 'Leave request awaiting your approval',
            body: `${request.student.name}'s leave request was approved by the class incharge.`,
            link: `/leave/${requestId}`,
          },
        });
      }
    }
  });

  revalidatePath('/leave');
  revalidatePath(`/leave/${requestId}`);
  return { ok: true };
}

export async function rejectAsIncharge(requestId: string, reason: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const request = await loadRequestForAction(requestId);
  if (!request) return { error: 'Request not found' };
  if (request.class.inchargeId !== principal.id) {
    return { error: 'You are not the class incharge for this request' };
  }
  if (request.status !== 'PENDING') {
    return { error: 'This request is not awaiting your decision' };
  }
  if (reason.trim().length < 5) {
    return { error: 'Please provide a reason' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        inchargeId: principal.id,
        inchargeAt: new Date(),
        inchargeRemark: reason.trim(),
      },
    });

    await tx.notification.create({
      data: {
        userId: request.student.id,
        title: 'Leave request rejected',
        body: `Your leave request was rejected by ${principal.name}. Reason: ${reason.trim()}`,
        link: `/leave/${requestId}`,
      },
    });
  });

  revalidatePath('/leave');
  revalidatePath(`/leave/${requestId}`);
  return { ok: true };
}

// ───────────────────────── HOD actions ──────────────────────────────

export async function approveAsHod(requestId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only the HOD can do this' };
  }

  const request = await loadRequestForAction(requestId);
  if (!request) return { error: 'Request not found' };
  if (request.student.departmentId !== principal.departmentId) {
    return { error: 'This request is not from your department' };
  }
  if (request.status !== 'PENDING_HOD') {
    return { error: 'This request is not awaiting HOD approval' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        hodId: principal.id,
        hodAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        userId: request.student.id,
        title: 'Leave request approved',
        body: `Your leave request was approved by ${principal.name}.`,
        link: `/leave/${requestId}`,
      },
    });
  });

  revalidatePath('/leave');
  revalidatePath(`/leave/${requestId}`);
  return { ok: true };
}

export async function rejectAsHod(requestId: string, reason: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only the HOD can do this' };
  }

  const request = await loadRequestForAction(requestId);
  if (!request) return { error: 'Request not found' };
  if (request.student.departmentId !== principal.departmentId) {
    return { error: 'This request is not from your department' };
  }
  if (request.status !== 'PENDING_HOD') {
    return { error: 'This request is not awaiting HOD approval' };
  }
  if (reason.trim().length < 5) {
    return { error: 'Please provide a reason' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        hodId: principal.id,
        hodAt: new Date(),
        hodRemark: reason.trim(),
      },
    });

    await tx.notification.create({
      data: {
        userId: request.student.id,
        title: 'Leave request rejected',
        body: `Your leave request was rejected by ${principal.name}. Reason: ${reason.trim()}`,
        link: `/leave/${requestId}`,
      },
    });
  });

  revalidatePath('/leave');
  revalidatePath(`/leave/${requestId}`);
  return { ok: true };
}