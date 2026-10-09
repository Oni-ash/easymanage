'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Status = 'PRESENT' | 'ABSENT' | 'LATE';

export async function saveAttendance(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role === 'STUDENT') return { error: 'Not authorized' };

  const classId = String(formData.get('classId') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');
  const period = Number(formData.get('period') ?? 0);
  const dateStr = String(formData.get('date') ?? '');
  if (!classId || !subjectId || !period || !dateStr) {
    return { error: 'Missing required fields' };
  }

  // Normalize date to midnight UTC so the same calendar day always maps
  // to the same AttendanceSession, regardless of what time we saved.
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  // Authorization: faculty must either be class incharge or teach this subject
  // to this class. HOD can mark any class in their department.
  const isHodHere =
    (principal.role === 'HOD' || principal.role === 'ADMIN') &&
    principal.departmentId !== null;

  const isIncharge = principal.inchargeOf.some((c) => c.id === classId);

  const teaches = await prisma.teachingAssignment.findFirst({
    where: { facultyId: principal.id, classId, subjectId },
  });

  if (!isHodHere && !isIncharge && !teaches) {
    return { error: 'You do not have permission to mark attendance for this class' };
  }

  // Collect statuses from the form: keys are "status-<studentId>"
  const statuses: Record<string, Status> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('status-') && typeof value === 'string') {
      const studentId = key.slice('status-'.length);
      if (value === 'PRESENT' || value === 'ABSENT' || value === 'LATE') {
        statuses[studentId] = value;
      }
    }
  }
  if (Object.keys(statuses).length === 0) {
    return { error: 'No attendance data submitted' };
  }

  // Upsert the session (idempotent — re-saving updates the existing one)
  const session = await prisma.attendanceSession.upsert({
    where: {
      classId_subjectId_date_period: { classId, subjectId, date, period },
    },
    update: { markedById: principal.id },
    create: {
      classId,
      subjectId,
      date,
      period,
      markedById: principal.id,
    },
  });

  // Upsert each record and create notifications for absences
  await prisma.$transaction(async (tx) => {
    for (const [studentId, status] of Object.entries(statuses)) {
      await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: { sessionId: session.id, studentId },
        },
        update: { status },
        create: { sessionId: session.id, studentId, status },
      });

      if (status === 'ABSENT') {
        await tx.notification.create({
          data: {
            userId: studentId,
            title: 'Marked absent',
            body: `You were marked absent for period ${period} on ${dateStr}.`,
            link: '/attendance',
          },
        });
      }
    }
  });

  revalidatePath('/attendance');
  return { ok: true };
}