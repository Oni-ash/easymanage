import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Divider, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { computeGrade } from '@/lib/grades';

type Params = Promise<{ examId: string }>;

export default async function StudentReportPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'STUDENT') redirect('/results');

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { department: { select: { code: true, name: true } } },
  });
  if (!exam || exam.kind !== 'INTERNAL') notFound();
  if (!exam.publishedAt) notFound();
  if (exam.departmentId !== principal.departmentId) notFound();

  const marks = await prisma.examMark.findMany({
    where: { examId, studentId: principal.id },
    include: {
      subject: { select: { code: true, name: true, hasPractical: true } },
    },
    orderBy: { subject: { code: 'asc' } },
  });

  if (marks.length === 0) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
          {exam.name}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          No marks recorded for you in this exam.
        </Typography>
      </Box>
    );
  }

  let totalObtained = 0;
  let totalMax = 0;
  let passes = 0;
  let fails = 0;

  const rows = marks.map((m) => {
    const hasPract = m.subject.hasPractical;
    const t = m.theoryMarks ?? 0;
    const p = m.practicalMarks ?? 0;
    const total = t + p;
    const max = 100;
    totalObtained += total;
    totalMax += max;
    const g = computeGrade(t, hasPract ? p : null, hasPract);
    if (g.passed) passes++;
    else fails++;
    return {
      id: m.id,
      code: m.subject.code,
      name: m.subject.name,
      hasPract,
      theory: m.theoryMarks,
      practical: m.practicalMarks,
      total,
      max,
      grade: g.grade,
      passed: g.passed,
    };
  });

  const percentage = totalMax === 0 ? 0 : Math.round((totalObtained / totalMax) * 100);
  const overallGrade =
    percentage >= 90 ? 'O'
      : percentage >= 80 ? 'A+'
      : percentage >= 70 ? 'A'
      : percentage >= 60 ? 'B+'
      : percentage >= 50 ? 'B'
      : percentage >= 45 ? 'C'
      : 'F';

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {exam.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.name} · {principal.class?.name} · Semester {principal.class?.semester}
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={4}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Overall
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, lineHeight: 1 }}
              color={percentage >= 45 ? 'primary' : 'error'}
            >
              {percentage}%
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {totalObtained} / {totalMax}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          <Stack spacing={0.5}>
            <Typography variant="body2">
              <strong>{rows.length}</strong> subjects
            </Typography>
            <Typography variant="body2">
              <strong>{passes}</strong> passed · <strong>{fails}</strong> failed
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Grade:
              </Typography>
              <Chip
                label={overallGrade}
                color={overallGrade === 'F' ? 'error' : 'success'}
                size="small"
              />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Subject</TableCell>
              <TableCell align="center">Theory</TableCell>
              <TableCell align="center">Practical</TableCell>
              <TableCell align="center">Total</TableCell>
              <TableCell align="center">Grade</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.code}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {r.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {r.theory ?? '—'} / {r.hasPract ? 90 : 100}
                </TableCell>
                <TableCell align="center">
                  {r.hasPract ? `${r.practical ?? '—'} / 10` : '—'}
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: r.passed ? 'text.primary' : 'error.main' }}
                  >
                    {r.total} / {r.max}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={r.grade}
                    size="small"
                    color={r.passed ? 'success' : 'error'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 2, display: 'block' }}>
        Pass mark: 45 / 100 (of which up to 10 may come from practicals, if the subject has a lab)
      </Typography>
    </Box>
  );
}