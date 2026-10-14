'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function publishEndSemExam(examId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'COE' && principal.role !== 'ADMIN') {
    return { error: 'Only the COE can publish end-semester results' };
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, kind: true, semester: true, publishedAt: true },
  });
  if (!exam) return { error: 'Exam not found' };
  if (exam.kind !== 'END_SEMESTER') return { error: 'Not an end-semester exam' };
  if (exam.publishedAt) return { error: 'Already published' };

  // Completeness check across all classes in all departments at this semester
  const classes = await prisma.class.findMany({
    where: { semester: exam.semester },
    include: {
      department: { select: { code: true } },
      students: { where: { role: 'STUDENT', active: true }, select: { id: true, name: true } },
    },
  });

  const subjects = await prisma.subject.findMany({
    where: { semester: exam.semester },
    select: { id: true, code: true, departmentId: true },
  });

  const marks = await prisma.examMark.findMany({
    where: { examId },
    select: { studentId: true, subjectId: true },
  });
  const markSet = new Set(marks.map((m) => `${m.studentId}::${m.subjectId}`));

  for (const c of classes) {
    const deptSubjects = subjects.filter((s) => s.departmentId === c.departmentId);
    for (const s of deptSubjects) {
      for (const st of c.students) {
        if (!markSet.has(`${st.id}::${s.id}`)) {
          return {
            error: `Missing marks: ${st.name} in ${c.department.code} ${c.name} — ${s.code}`,
          };
        }
      }
    }
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
        action: 'END_SEM_RESULTS_PUBLISHED',
        entity: 'Exam',
        entityId: examId,
      },
    });

    // Notify all students in this semester
    const recipients = await tx.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
        class: { semester: exam.semester },
      },
      select: { id: true },
    });

    if (recipients.length > 0) {
      await tx.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          title: 'End-semester results published',
          body: 'Your exam results are now available.',
          link: '/results',
        })),
      });
    }
  });

  revalidatePath('/results');
  revalidatePath(`/results/coe/${examId}`);
  return { ok: true };
}