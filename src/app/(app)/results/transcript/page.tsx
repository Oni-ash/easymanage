import { redirect } from 'next/navigation';
import { Box, Chip, Divider, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { gradePoint, computeGpa } from '@/lib/grades';

export default async function TranscriptPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'STUDENT') redirect('/results');
  if (!principal.class) redirect('/results');

  // All published marks the student has, ordered chronologically
  const marks = await prisma.examMark.findMany({
    where: {
      studentId: principal.id,
      exam: { publishedAt: { not: null } },
    },
    orderBy: [{ exam: { publishedAt: 'asc' } }, { subject: { code: 'asc' } }],
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          kind: true,
          session: true,
          semester: true,
          publishedAt: true,
        },
      },
      subject: {
        select: { id: true, code: true, name: true, hasPractical: true },
      },
    },
  });

  // Latest mark per subject (for backlog detection)
  const latestBySubject = new Map<string, (typeof marks)[number]>();
  for (const m of marks) {
    // marks are ordered oldest→newest, so each iteration overwrites
    latestBySubject.set(m.subjectId, m);
  }

  // Backlogs = subjects whose latest mark is a fail
  const backlogs = [...latestBySubject.values()].filter((m) => m.grade === 'F');

  // Group end-sem marks by exam (for the transcript grid)
  const endSemMarks = marks.filter((m) => m.exam.kind === 'END_SEMESTER');
  const byExam = new Map<string, typeof endSemMarks>();
  for (const m of endSemMarks) {
    const arr = byExam.get(m.exam.id) ?? [];
    arr.push(m);
    byExam.set(m.exam.id, arr);
  }

  // CGPA from end-sem marks only
  const allEndSemGPs = endSemMarks.map((m) => gradePoint(m.grade ?? 'F'));
  const cgpa = computeGpa(allEndSemGPs);

  // Credit count = subjects passed (latest mark not F)
  const passedSubjectIds = new Set(
    [...latestBySubject.values()]
      .filter((m) => m.grade !== 'F')
      .map((m) => m.subjectId),
  );
  const totalSubjects = new Set(marks.map((m) => m.subjectId)).size;

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Transcript
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.name} · {principal.class.name} · Semester {principal.class.semester}
      </Typography>

      {/* Summary cards */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, flexWrap: 'wrap' }}
      >
        <SummaryCard label="CGPA" value={cgpa.toFixed(2)} sub="from end-sem results" />
        <SummaryCard
          label="Subjects passed"
          value={`${passedSubjectIds.size} / ${totalSubjects}`}
          sub="latest mark per subject"
        />
        <SummaryCard
          label="Active backlogs"
          value={String(backlogs.length)}
          sub={backlogs.length === 0 ? 'all clear' : 'need to be cleared'}
          color={backlogs.length > 0 ? 'error' : 'success'}
        />
      </Stack>

      {/* Backlogs */}
      {backlogs.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Active backlogs
          </Typography>
          <Paper sx={{ borderRadius: 3, mb: 4, overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>Failed in</TableCell>
                  <TableCell align="center">Marks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backlogs.map((m) => {
                  const total = (m.theoryMarks ?? 0) + (m.practicalMarks ?? 0);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {m.subject.code}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {m.subject.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{m.exam.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {m.exam.session ?? ''} · Semester {m.exam.semester}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                          {total} / 100
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {/* End-sem history */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        End-semester results
      </Typography>

      {byExam.size === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No end-semester results yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3} sx={{ mb: 4 }}>
          {[...byExam.entries()].map(([examId, examMarks]) => {
            const exam = examMarks[0].exam;
            const gps = examMarks.map((m) => gradePoint(m.grade ?? 'F'));
            const examGpa = computeGpa(gps);
            return (
              <Box key={examId}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {exam.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {exam.session ?? ''} · Semester {exam.semester}
                    </Typography>
                  </Box>
                  <Chip label={`GPA ${examGpa.toFixed(2)}`} color="primary" size="small" />
                </Stack>
                <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Subject</TableCell>
                        <TableCell align="center">Theory</TableCell>
                        <TableCell align="center">Practical</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">Grade</TableCell>
                        <TableCell align="center">Points</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {examMarks.map((m) => {
                        const total = (m.theoryMarks ?? 0) + (m.practicalMarks ?? 0);
                        return (
                          <TableRow key={m.id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {m.subject.code}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {m.subject.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {m.theoryMarks ?? '—'} / {m.subject.hasPractical ? 90 : 100}
                            </TableCell>
                            <TableCell align="center">
                              {m.subject.hasPractical ? `${m.practicalMarks ?? '—'} / 10` : '—'}
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: m.grade === 'F' ? 'error.main' : 'text.primary',
                                }}
                              >
                                {total} / 100
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={m.grade ?? 'F'}
                                size="small"
                                color={m.grade === 'F' ? 'error' : 'success'}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {gradePoint(m.grade ?? 'F')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Internal history (collapsed/simple) */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Internal exams
      </Typography>
      {marks.filter((m) => m.exam.kind === 'INTERNAL').length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No internal exam marks yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Exam</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell align="center">Total</TableCell>
                <TableCell align="center">Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {marks
                .filter((m) => m.exam.kind === 'INTERNAL')
                .map((m) => {
                  const total = (m.theoryMarks ?? 0) + (m.practicalMarks ?? 0);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{m.exam.name}</TableCell>
                      <TableCell>
                        {m.subject.code} · {m.subject.name}
                      </TableCell>
                      <TableCell align="center">{total} / 100</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={m.grade ?? 'F'}
                          size="small"
                          color={m.grade === 'F' ? 'error' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        CGPA computed from end-semester results only. Internals shown separately.
        Pass mark: 45 / 100. Grade points: O=10, A+=9, A=8, B+=7, B=6, C=5, F=0.
      </Typography>
    </Box>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, minWidth: 180 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, lineHeight: 1.1, color: color ?? 'primary.main' }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
}