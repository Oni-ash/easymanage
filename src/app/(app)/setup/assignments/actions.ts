'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

async function assertDeptAccess(
  principalRole: string,
  principalDeptId: string | null,
  targetDeptId: string,
): Promise<boolean> {
  if (principalRole === 'ADMIN') return true;
  return principalDeptId === targetDeptId;
}

export async function createAssignment(input: {
  facultyId: string;
  subjectId: string;
  classId: string;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only HOD or admin can manage assignments' };
  }

  const [faculty, subject, cls] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.facultyId },
      select: { role: true, departmentId: true, active: true, name: true },
    }),
    prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: { departmentId: true, active: true, semester: true, code: true },
    }),
    prisma.class.findUnique({
      where: { id: input.classId },
      select: { departmentId: true, semester: true, name: true },
    }),
  ]);

  if (!faculty || faculty.role !== 'FACULTY' || !faculty.active) {
    return { error: 'Invalid faculty' };
  }
  if (!subject || !subject.active) return { error: 'Invalid subject' };
  if (!cls) return { error: 'Invalid class' };

  // Cross-check departments
  const okFaculty = await assertDeptAccess(principal.role, principal.departmentId, faculty.departmentId ?? '');
  const okSubject = await assertDeptAccess(principal.role, principal.departmentId, subject.departmentId);
  const okClass = await assertDeptAccess(principal.role, principal.departmentId, cls.departmentId);
  if (!okFaculty || !okSubject || !okClass) {
    return { error: 'One or more entities are outside your department' };
  }

  if (subject.semester !== cls.semester) {
    return { error: `${subject.code} is for semester ${subject.semester} but ${cls.name} is semester ${cls.semester}` };
  }

  // Prevent duplicate
  const existing = await prisma.teachingAssignment.findFirst({
    where: { facultyId: input.facultyId, subjectId: input.subjectId, classId: input.classId },
    select: { id: true },
  });
  if (existing) {
    return { error: 'This faculty is already assigned to this subject and class' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.teachingAssignment.create({
      data: {
        facultyId: input.facultyId,
        subjectId: input.subjectId,
        classId: input.classId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'TEACHING_ASSIGNMENT_CREATED',
        entity: 'TeachingAssignment',
        entityId: `${input.facultyId}:${input.subjectId}:${input.classId}`,
        meta: { faculty: faculty.name, subject: subject.code, class: cls.name },
      },
    });
  });

  revalidatePath('/setup/assignments');
  return { ok: true };
}

export async function deleteAssignment(assignmentId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only HOD or admin can manage assignments' };
  }

  const assignment = await prisma.teachingAssignment.findUnique({
    where: { id: assignmentId },
    include: { class: { select: { departmentId: true } } },
  });
  if (!assignment) return { error: 'Assignment not found' };

  const ok = await assertDeptAccess(
    principal.role,
    principal.departmentId,
    assignment.class.departmentId,
  );
  if (!ok) return { error: 'This assignment is not in your department' };

  await prisma.$transaction(async (tx) => {
    await tx.teachingAssignment.delete({ where: { id: assignmentId } });
    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'TEACHING_ASSIGNMENT_DELETED',
        entity: 'TeachingAssignment',
        entityId: assignmentId,
      },
    });
  });

  revalidatePath('/setup/assignments');
  return { ok: true };
}