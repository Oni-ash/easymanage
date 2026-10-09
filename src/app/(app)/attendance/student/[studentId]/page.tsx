import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Params = Promise<{ studentId: string }>;

export default async function StudentRecordPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role === 'STUDENT') redirect('/attendance');

  const { studentId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      class: { select: { id: true, name: true, semester: true, departmentId: true } },
      department: { select: { name: true, code: true } },
    },
  });
  if (!student) notFound();

  // Authorization: HOD must be in same department; faculty must teach their class
  const inDept =
    (principal.role === 'HOD' || principal.role === 'ADMIN') &&
    principal.departmentId === student.departmentId;
  const teaches = student.classId
    ? await prisma.teachingAssignment.findFirst({
        where: { facultyId: principal.id, classId: student.classId },
      })
    : null;
  if (!inDept && !teaches) notFound();

  const records = await prisma.attendanceRecord.findMany({
    where: { studentId },
    include: {
      session: {
        select: {
          date: true,
          period: true,
          subject: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: [{ session: { date: 'desc' } }, { session: { period: 'asc' } }],
  });

  const total = records.length;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const late = records.filter((r) => r.status === 'LATE').length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const percentage = total === 0 ? 0 : Math.round(((present + late) / total) * 100);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {student.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {student.class?.name ?? 'No class'} · {student.department?.code ?? ''} · {student.username}
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
        <Stack direction="row" spacing={4} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Overall
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, lineHeight: 1 }}
              color={percentage >= 75 ? 'primary' : 'error'}
            >
              {percentage}%
            </Typography>
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="body2"><strong>{total}</strong> total sessions</Typography>
            <Typography variant="body2">
              <strong>{present}</strong> present · <strong>{late}</strong> late ·{' '}
              <strong>{absent}</strong> absent
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Full history
      </Typography>

      {records.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>No attendance recorded yet.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.session.date.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell>{r.session.period}</TableCell>
                  <TableCell>{r.session.subject.name}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={r.status}
                      size="small"
                      color={
                        r.status === 'PRESENT'
                          ? 'success'
                          : r.status === 'ABSENT'
                            ? 'error'
                            : 'warning'
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}