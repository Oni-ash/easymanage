import { notFound, redirect } from 'next/navigation';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import MarkingForm from './marking-form';

type SearchParams = Promise<{
  classId?: string;
  subjectId?: string;
  period?: string;
  date?: string;
}>;

export default async function MarkAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role === 'STUDENT') redirect('/attendance');

  const sp = await searchParams;
  const classId = sp.classId ?? '';
  const subjectId = sp.subjectId ?? '';
  const period = Number(sp.period ?? 0);
  const dateStr = sp.date ?? '';
  if (!classId || !subjectId || !period || !dateStr) notFound();

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const [classInfo, subject, students, existingSession] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      include: { department: { select: { name: true, code: true } } },
    }),
    prisma.subject.findUnique({
      where: { id: subjectId },
      select: { name: true, code: true },
    }),
    prisma.user.findMany({
      where: { classId, role: 'STUDENT', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true },
    }),
    prisma.attendanceSession.findUnique({
      where: {
        classId_subjectId_date_period: { classId, subjectId, date, period },
      },
      include: { records: { select: { studentId: true, status: true } } },
    }),
  ]);

  if (!classInfo || !subject) notFound();

  const initial = Object.fromEntries(
    (existingSession?.records ?? []).map((r) => [r.studentId, r.status]),
  ) as Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>;

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Mark attendance
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {classInfo.name} · {subject.name} · Period {period} · {dateStr}
      </Typography>

      {existingSession && (
        <Paper sx={{ p: 2, borderRadius: 3, mb: 2, bgcolor: 'warning.50' }}>
          <Typography variant="body2">
            This session was already marked. Saving will overwrite the existing records.
          </Typography>
        </Paper>
      )}

      <MarkingForm
        classId={classId}
        subjectId={subjectId}
        period={period}
        date={dateStr}
        students={students}
        initial={initial}
      />
    </Box>
  );
}