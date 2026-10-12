'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

type UpsertInput = {
  classId: string;
  dayOfWeek: number;
  period: number;
  subjectId: string;
  facultyId: string;
  room: string | null;
};

async function authorizeForClass(classId: string): Promise<
  | { error: string }
  | { principal: NonNullable<Awaited<ReturnType<typeof getPrincipal>>>; departmentId: string }
> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { departmentId: true },
  });
  if (!cls) return { error: 'Class not found' };

  const canEdit =
    principal.role === 'ADMIN' ||
    (principal.role === 'HOD' && principal.departmentId === cls.departmentId);

  if (!canEdit) return { error: 'Only the HOD or admin can edit schedules' };

  return { principal, departmentId: cls.departmentId };
}

export async function upsertSlot(input: UpsertInput): Promise<Result> {
  const auth = await authorizeForClass(input.classId);
  if ('error' in auth) return auth;

  if (
    input.dayOfWeek < 1 ||
    input.dayOfWeek > 5 ||
    input.period < 1 ||
    input.period > 7
  ) {
    return { error: 'Invalid day or period' };
  }
  if (!input.subjectId || !input.facultyId) {
    return { error: 'Subject and faculty are required' };
  }

  // Verify subject and faculty belong to the same department
  const [subject, faculty] = await Promise.all([
    prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: { departmentId: true, code: true },
    }),
    prisma.user.findUnique({
      where: { id: input.facultyId },
      select: { departmentId: true, name: true, role: true },
    }),
  ]);

  if (!subject || subject.departmentId !== auth.departmentId) {
    return { error: 'Subject is not in this department' };
  }
  if (!faculty || faculty.role !== 'FACULTY' || faculty.departmentId !== auth.departmentId) {
    return { error: 'Faculty is not in this department' };
  }

  // ── Conflict 1: faculty is already teaching elsewhere at this day+period
  const facultyConflict = await prisma.scheduleSlot.findFirst({
    where: {
      facultyId: input.facultyId,
      dayOfWeek: input.dayOfWeek,
      period: input.period,
      NOT: { classId: input.classId },
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { code: true } },
    },
  });
  if (facultyConflict) {
    return {
      error: `${faculty.name} is already teaching ${facultyConflict.subject.code} to ${facultyConflict.class.name} at this time.`,
    };
  }

  // ── Conflict 2: same room in use by another class at this day+period
  if (input.room) {
    const roomConflict = await prisma.scheduleSlot.findFirst({
      where: {
        room: input.room,
        dayOfWeek: input.dayOfWeek,
        period: input.period,
        NOT: { classId: input.classId },
      },
      include: { class: { select: { name: true } } },
    });
    if (roomConflict) {
      return {
        error: `Room ${input.room} is already in use by ${roomConflict.class.name} at this time.`,
      };
    }
  }

  // Upsert: unique key is (classId, dayOfWeek, period)
  await prisma.scheduleSlot.upsert({
    where: {
      classId_dayOfWeek_period: {
        classId: input.classId,
        dayOfWeek: input.dayOfWeek,
        period: input.period,
      },
    },
    update: {
      subjectId: input.subjectId,
      facultyId: input.facultyId,
      room: input.room,
      updatedById: auth.principal.id,
    },
    create: {
      classId: input.classId,
      dayOfWeek: input.dayOfWeek,
      period: input.period,
      subjectId: input.subjectId,
      facultyId: input.facultyId,
      room: input.room,
      updatedById: auth.principal.id,
    },
  });

  revalidatePath(`/schedule/class/${input.classId}`);
  revalidatePath('/schedule');
  return { ok: true };
}

export async function deleteSlot(slotId: string): Promise<Result> {
  const slot = await prisma.scheduleSlot.findUnique({
    where: { id: slotId },
    select: { classId: true },
  });
  if (!slot) return { error: 'Slot not found' };

  const auth = await authorizeForClass(slot.classId);
  if ('error' in auth) return auth;

  await prisma.scheduleSlot.delete({ where: { id: slotId } });

  revalidatePath(`/schedule/class/${slot.classId}`);
  revalidatePath('/schedule');
  return { ok: true };
}