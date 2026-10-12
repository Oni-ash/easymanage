'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

type Scope = 'DEPARTMENT' | 'SEMESTER' | 'CLASS';

type EventInput = {
  id?: string;
  title: string;
  details: string | null;
  scope: Scope;
  semester: number | null;
  classId: string | null;
  startAt: string;
  endAt: string | null;
};

async function authorize(): Promise<
  | { error: string }
  | {
      principal: NonNullable<Awaited<ReturnType<typeof getPrincipal>>>;
      departmentId: string;
    }
> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only HOD or admin can manage calendar events' };
  }
  if (!principal.departmentId) {
    return { error: 'You are not assigned to a department' };
  }
  return { principal, departmentId: principal.departmentId };
}

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function validateAndResolve(
  input: EventInput,
): { error: string } | { startAt: Date; endAt: Date | null; classId: string | null; semester: number | null } {
  if (!input.title.trim() || input.title.trim().length < 3) {
    return { error: 'Title must be at least 3 characters' };
  }
  if (!['DEPARTMENT', 'SEMESTER', 'CLASS'].includes(input.scope)) {
    return { error: 'Invalid scope' };
  }
  const startAt = parseDate(input.startAt);
  if (!startAt) return { error: 'Invalid start date' };
  const endAt = input.endAt ? parseDate(input.endAt) : null;
  if (input.endAt && !endAt) return { error: 'Invalid end date' };
  if (endAt && endAt < startAt) return { error: 'End date cannot be before start date' };

  let classId: string | null = null;
  let semester: number | null = null;

  if (input.scope === 'SEMESTER') {
    if (!input.semester || input.semester < 1 || input.semester > 8) {
      return { error: 'Semester must be between 1 and 8' };
    }
    semester = input.semester;
  } else if (input.scope === 'CLASS') {
    if (!input.classId) return { error: 'Class is required' };
    classId = input.classId;
  }

  return { startAt, endAt, classId, semester };
}

export async function createEvent(input: EventInput): Promise<Result> {
  const auth = await authorize();
  if ('error' in auth) return auth;

  const resolved = validateAndResolve(input);
  if ('error' in resolved) return resolved;

  if (resolved.classId) {
    const cls = await prisma.class.findUnique({
      where: { id: resolved.classId },
      select: { departmentId: true },
    });
    if (!cls || cls.departmentId !== auth.departmentId) {
      return { error: 'Class is not in your department' };
    }
  }

  await prisma.calendarEvent.create({
    data: {
      title: input.title.trim(),
      details: input.details?.trim() || null,
      scope: input.scope,
      departmentId: auth.departmentId,
      classId: resolved.classId,
      semester: resolved.semester,
      startAt: resolved.startAt,
      endAt: resolved.endAt,
      createdById: auth.principal.id,
    },
  });

  revalidatePath('/calendar');
  return { ok: true };
}

export async function updateEvent(input: EventInput): Promise<Result> {
  if (!input.id) return { error: 'Event ID is required' };
  const auth = await authorize();
  if ('error' in auth) return auth;

  const existing = await prisma.calendarEvent.findUnique({
    where: { id: input.id },
    select: { scope: true, departmentId: true },
  });
  if (!existing) return { error: 'Event not found' };
  if (existing.scope === 'COLLEGE') {
    return { error: 'College-wide events can only be edited by admin' };
  }
  if (existing.departmentId !== auth.departmentId) {
    return { error: 'Event is not in your department' };
  }

  const resolved = validateAndResolve(input);
  if ('error' in resolved) return resolved;

  if (resolved.classId) {
    const cls = await prisma.class.findUnique({
      where: { id: resolved.classId },
      select: { departmentId: true },
    });
    if (!cls || cls.departmentId !== auth.departmentId) {
      return { error: 'Class is not in your department' };
    }
  }

  await prisma.calendarEvent.update({
    where: { id: input.id },
    data: {
      title: input.title.trim(),
      details: input.details?.trim() || null,
      scope: input.scope,
      classId: resolved.classId,
      semester: resolved.semester,
      startAt: resolved.startAt,
      endAt: resolved.endAt,
    },
  });

  revalidatePath('/calendar');
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<Result> {
  const auth = await authorize();
  if ('error' in auth) return auth;

  const existing = await prisma.calendarEvent.findUnique({
    where: { id },
    select: { scope: true, departmentId: true },
  });
  if (!existing) return { error: 'Event not found' };
  if (existing.scope === 'COLLEGE') {
    return { error: 'College-wide events can only be deleted by admin' };
  }
  if (existing.departmentId !== auth.departmentId) {
    return { error: 'Event is not in your department' };
  }

  await prisma.calendarEvent.delete({ where: { id } });

  revalidatePath('/calendar');
  return { ok: true };
}