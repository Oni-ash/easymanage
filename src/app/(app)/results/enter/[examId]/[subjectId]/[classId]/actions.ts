'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { computeGrade } from '@/lib/grades';

type Result = { ok: true } | { error: string };

type Entry = {
  studentId: string;
  theoryMarks: number | null;
  practicalMarks: number | null;
};

export async function saveMarks(input: {
  examId: string;
  subjectId: string;
  classId: string;
  hasPractical: boolean;
  entries: Entry[];
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'FACULTY') return { error: 'Only faculty can enter marks' };

  const [exam, subject, teaches] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, kind: true, publishedAt: true, semester: true },
    }),
    prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: { id: true, hasPractical: true },
    }),
    prisma.teachingAssignment.findFirst({
      where: {
        facultyId: principal.id,
        subjectId: input.subjectId,
        classId: input.classId,
      },
    }),
  ]);

  if (!exam) return { error: 'Exam not found' };
  if (exam.kind !== 'INTERNAL') return { error: 'This exam is not editable by faculty' };
  if (exam.publishedAt) return { error: 'Exam is already published — cannot edit marks' };
  if (!subject) return { error: 'Subject not found' };
  if (!teaches) return { error: 'You do not teach this subject to this class' };

  // Validate each entry
  const maxTheory = subject.hasPractical ? 90 : 100;
  const maxPractical = subject.hasPractical ? 10 : 0;

  for (const e of input.entries) {
    if (e.theoryMarks != null) {
      if (!Number.isInteger(e.theoryMarks) || e.theoryMarks < 0 || e.theoryMarks > maxTheory) {
        return { error: `Theory marks must be between 0 and ${maxTheory}` };
      }
    }
    if (subject.hasPractical && e.practicalMarks != null) {
      if (!Number.isInteger(e.practicalMarks) || e.practicalMarks < 0 || e.practicalMarks > maxPractical) {
        return { error: `Practical marks must be between 0 and ${maxPractical}` };
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const e of input.entries) {
      const grade = computeGrade(
        e.theoryMarks,
        e.practicalMarks,
        subject.hasPractical,
      ).grade;

      const existing = await tx.examMark.findUnique({
        where: {
          examId_studentId_subjectId: {
            examId: input.examId,
            studentId: e.studentId,
            subjectId: input.subjectId,
          },
        },
        select: { id: true, theoryMarks: true, practicalMarks: true },
      });

      if (existing) {
        // Record a revision if marks actually changed
        const theoryChanged = existing.theoryMarks !== e.theoryMarks;
        const practicalChanged = existing.practicalMarks !== e.practicalMarks;
        if (theoryChanged || practicalChanged) {
          await tx.markRevision.create({
            data: {
              examMarkId: existing.id,
              oldMarks: (existing.theoryMarks ?? 0) + (existing.practicalMarks ?? 0),
              newMarks: (e.theoryMarks ?? 0) + (e.practicalMarks ?? 0),
              changedById: principal.id,
              reason: 'Faculty edit before publish',
            },
          });
        }

        await tx.examMark.update({
          where: { id: existing.id },
          data: {
            theoryMarks: e.theoryMarks,
            practicalMarks: e.practicalMarks,
            maxTheory: subject.hasPractical ? 90 : 100,
            maxPractical: subject.hasPractical ? 10 : 0,
            grade,
            enteredById: principal.id,
          },
        });
      } else {
        await tx.examMark.create({
          data: {
            examId: input.examId,
            studentId: e.studentId,
            subjectId: input.subjectId,
            theoryMarks: e.theoryMarks,
            practicalMarks: e.practicalMarks,
            maxTheory: subject.hasPractical ? 90 : 100,
            maxPractical: subject.hasPractical ? 10 : 0,
            grade,
            enteredById: principal.id,
          },
        });
      }
    }
  });

  revalidatePath(`/results/enter/${input.examId}/${input.subjectId}/${input.classId}`);
  revalidatePath('/results');
  return { ok: true };
}