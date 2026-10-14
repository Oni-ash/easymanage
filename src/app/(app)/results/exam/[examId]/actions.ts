'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function publishExam(examId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
    return { error: 'Only the HOD can publish results' };
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      kind: true,
      departmentId: true,
      semester: true,
      publishedAt: true,
    },
  });
  if (!exam) return { error: 'Exam not found' };
  if (exam.kind !== 'INTERNAL') return { error: 'Not an internal exam' };
  if (exam.publishedAt) return { error: 'Already published' };
  if (!exam.departmentId) return { error: 'Exam has no department' };
  if (principal.role === 'HOD' && principal.departmentId !== exam.departmentId) {
    return { error: 'Not your department' };
  }

  // Verify completeness: every (class, subject) from teaching assignments
  // in this department+semester must have marks for every student in that class.
  const [classes, students, marks, assignments] = await Promise.all([
    prisma.class.findMany({
      where: { departmentId: exam.departmentId, semester: exam.semester },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
        class: { departmentId: exam.departmentId, semester: exam.semester },
      },
      select: { id: true, name: true, classId: true },
    }),
    prisma.examMark.findMany({
      where: { examId },
      select: { studentId: true, subjectId: true },
    }),
    prisma.teachingAssignment.findMany({
      where: {
        class: { departmentId: exam.departmentId, semester: exam.semester },
      },
      select: { classId: true, subjectId: true },
    }),
  ]);

  const markSet = new Set(marks.map((m) => `${m.studentId}::${m.subjectId}`));
  const assignmentsSeen = new Set<string>();

  for (const a of assignments) {
    const key = `${a.classId}::${a.subjectId}`;
    if (assignmentsSeen.has(key)) continue;
    assignmentsSeen.add(key);

    const cls = classes.find((c) => c.id === a.classId);
    const classStudents = students.filter((s) => s.classId === a.classId);

    for (const s of classStudents) {
      if (!markSet.has(`${s.id}::${a.subjectId}`)) {
        return {
          error: `Missing marks for ${s.name} in ${cls?.name ?? 'class'} — one or more subjects incomplete`,
        };
      }
    }
  }

  if (assignmentsSeen.size === 0) {
    return { error: 'No teaching assignments to validate against' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.exam.update({
      where: { id: examId },
      data: {
        publishedAt: new Date(),
        publishedById: principal.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'EXAM_PUBLISHED',
        entity: 'Exam',
        entityId: examId,
      },
    });

    // Notify all students in the exam's semester + department
    const recipients = await tx.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
        class: { departmentId: exam.departmentId, semester: exam.semester },
      },
      select: { id: true },
    });

    if (recipients.length > 0) {
      await tx.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          title: 'Exam results published',
          body: 'Your internal exam marks are now available.',
          link: '/results',
        })),
      });
    }
  });

  revalidatePath('/results');
  revalidatePath(`/results/exam/${examId}`);
  return { ok: true };
}