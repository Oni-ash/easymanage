import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import LinkButton from '../../link-button';

type Params = Promise<{ classId: string }>;

export default async function ClassAttendancePage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role === 'STUDENT') redirect('/attendance');

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      department: { select: { id: true, name: true, code: true } },
      incharge: { select: { name: true } },
    },
  });
  if (!cls) notFound();

  // Authorization: HOD must be in same department; faculty must be incharge or teach the class
  const isHodOfDept =
    (principal.role === 'HOD' || principal.role === 'ADMIN') &&
    principal.departmentId === cls.departmentId;
  const isIncharge = principal.inchargeOf.some((c) => c.id === classId);
  const teaches = await prisma.teachingAssignment.findFirst({
    where: { facultyId: principal.id, classId },
  });
  if (!isHodOfDept && !isIncharge && !teaches) notFound();

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const students = await prisma.user.findMany({
    where: { classId, role: 'STUDENT', active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, username: true },
  });

  // Today's attendance records for these students
  const todayRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      session: { date: todayStart },
    },
    include: {
      session: {
        select: {
          period: true,
          subject: { select: { name: true, code: true } },
        },
      },
    },
  });

  // Group today's records by student
  const byStudent = new Map<string, { subject: string; period: number; status: string }[]>();
  for (const r of todayRecords) {
    const arr = byStudent.get(r.studentId) ?? [];
    arr.push({
      subject: r.session.subject.name,
      period: r.session.period,
      status: r.status,
    });
    byStudent.set(r.studentId, arr);
  }

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {cls.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {cls.department.name} · Semester {cls.semester}
        {cls.incharge ? ` · Incharge: ${cls.incharge.name}` : ''}
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Today&apos;s attendance
      </Typography>

      {students.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>No students in this class.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {students.map((s) => {
            const records = byStudent.get(s.id) ?? [];
            return (
              <Paper key={s.id} sx={{ p: 2, borderRadius: 3 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{
                    alignItems: { xs: 'stretch', sm: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {s.username}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    {records.length === 0 ? (
                      <Chip label="Nothing marked today" variant="outlined" size="small" />
                    ) : (
                      records.map((r, i) => (
                        <Chip
                          key={i}
                          label={`P${r.period} · ${r.status}`}
                          color={
                            r.status === 'PRESENT'
                              ? 'success'
                              : r.status === 'ABSENT'
                                ? 'error'
                                : 'warning'
                          }
                          size="small"
                        />
                      ))
                    )}
                    <LinkButton
                      href={`/attendance/student/${s.id}`}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 999 }}
                    >
                      Full record
                    </LinkButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}