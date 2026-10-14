import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { computeGrade } from '@/lib/grades';
import PublishButton from './publish-button';

type Params = Promise<{ examId: string }>;

export default async function ExamDetailPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') redirect('/results');

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { department: { select: { name: true, code: true } } },
  });
  if (!exam || exam.kind !== 'INTERNAL') notFound();
  if (
    principal.role === 'HOD' &&
    principal.departmentId !== exam.departmentId
  ) {
    notFound();
  }
  if (!exam.departmentId) notFound();

  // Fetch everything we need for the completeness grid
  const [classes, subjects, students, marks, assignments] = await Promise.all([
    prisma.class.findMany({
      where: { departmentId: exam.departmentId, semester: exam.semester },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { departmentId: exam.departmentId, semester: exam.semester },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, hasPractical: true },
    }),
    prisma.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
        class: { departmentId: exam.departmentId, semester: exam.semester },
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true, classId: true },
    }),
    prisma.examMark.findMany({
      where: { examId: exam.id },
      select: {
        studentId: true,
        subjectId: true,
        theoryMarks: true,
        practicalMarks: true,
        grade: true,
      },
    }),
    prisma.teachingAssignment.findMany({
      where: {
        class: { departmentId: exam.departmentId, semester: exam.semester },
      },
      select: { classId: true, subjectId: true },
    }),
  ]);

  const markSet = new Set(marks.map((m) => `${m.studentId}::${m.subjectId}`));
  const studentsByClass = new Map<string, typeof students>();
  for (const s of students) {
    const arr = studentsByClass.get(s.classId ?? '') ?? [];
    arr.push(s);
    studentsByClass.set(s.classId ?? '', arr);
  }

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));

  // Build per-class-per-subject completeness
  type Cell = {
    classId: string;
    className: string;
    subjectId: string;
    subjectCode: string;
    total: number;
    filled: number;
    complete: boolean;
  };

  const cells: Cell[] = [];
  const seen = new Set<string>();
  for (const a of assignments) {
    const key = `${a.classId}::${a.subjectId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cls = classes.find((c) => c.id === a.classId);
    const sub = subjectsById.get(a.subjectId);
    if (!cls || !sub) continue;
    const classStudents = studentsByClass.get(a.classId) ?? [];
    const filled = classStudents.filter((s) =>
      markSet.has(`${s.id}::${a.subjectId}`),
    ).length;
    cells.push({
      classId: cls.id,
      className: cls.name,
      subjectId: sub.id,
      subjectCode: sub.code,
      total: classStudents.length,
      filled,
      complete: filled === classStudents.length && classStudents.length > 0,
    });
  }

  // Group by class for display
  const cellsByClass = new Map<string, Cell[]>();
  for (const c of cells) {
    const arr = cellsByClass.get(c.classId) ?? [];
    arr.push(c);
    cellsByClass.set(c.classId, arr);
  }

  const allComplete = cells.length > 0 && cells.every((c) => c.complete);
  const completedCount = cells.filter((c) => c.complete).length;

  // Per-student summary
  const marksByStudent = new Map<string, typeof marks>();
  for (const m of marks) {
    const arr = marksByStudent.get(m.studentId) ?? [];
    arr.push(m);
    marksByStudent.set(m.studentId, arr);
  }

  const studentSummaries = students.map((s) => {
    const studentMarks = marksByStudent.get(s.id) ?? [];
    let totalObtained = 0;
    let totalMax = 0;
    let fails = 0;
    for (const m of studentMarks) {
      const sub = subjectsById.get(m.subjectId);
      const hasPract = sub?.hasPractical ?? false;
      const t = m.theoryMarks ?? 0;
      const p = m.practicalMarks ?? 0;
      const total = t + p;
      const max = hasPract ? 100 : 100;
      totalObtained += total;
      totalMax += max;
      const g = computeGrade(t, hasPract ? p : null, hasPract);
      if (!g.passed) fails++;
    }
    return {
      id: s.id,
      name: s.name,
      username: s.username,
      className: classes.find((c) => c.id === s.classId)?.name ?? '—',
      subjects: studentMarks.length,
      totalObtained,
      totalMax,
      fails,
    };
  });

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {exam.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {exam.session ?? ''} · Semester {exam.semester} · {exam.department.name}
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3 }}>
        {exam.publishedAt ? (
          <Chip label="Published" color="success" />
        ) : (
          <Chip label="Draft" variant="outlined" />
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {completedCount} / {cells.length} subject-class pairs complete
        </Typography>
      </Stack>

      {/* Completeness grid */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Mark entry status
      </Typography>
      <Stack spacing={2} sx={{ mb: 4 }}>
        {[...cellsByClass.entries()].map(([classId, classCells]) => (
          <Paper key={classId} sx={{ p: 2, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 1.5 }}>
              {classCells[0].className}
            </Typography>
            <Stack spacing={1}>
              {classCells.map((c) => (
                <Stack
                  key={`${c.classId}-${c.subjectId}`}
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: c.complete ? 'success.light' : 'warning.light',
                    color: c.complete ? 'success.contrastText' : 'warning.contrastText',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {c.subjectCode}
                  </Typography>
                  <Typography variant="body2">
                    {c.filled} / {c.total} {c.complete ? '✓' : ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        ))}
        {cells.length === 0 && (
          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Typography sx={{ color: 'text.secondary' }}>
              No teaching assignments for this exam&apos;s semester.
            </Typography>
          </Paper>
        )}
      </Stack>

      {/* Publish */}
      <Paper sx={{ p: 3, borderRadius: 4, mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Publish
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {exam.publishedAt
            ? `Published on ${exam.publishedAt.toLocaleString('en-IN')}. Marks are now visible to students and locked from edits.`
            : allComplete
              ? 'All marks entered. You can publish the results now.'
              : 'All subject-class pairs must be complete before publishing.'}
        </Typography>
        {!exam.publishedAt && (
          <PublishButton examId={exam.id} disabled={!allComplete} />
        )}
      </Paper>

      {/* Per-student summary */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Student summary
      </Typography>
      <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Class</TableCell>
              <TableCell align="center">Subjects</TableCell>
              <TableCell align="center">Total</TableCell>
              <TableCell align="center">Fails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {studentSummaries.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {s.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {s.username}
                  </Typography>
                </TableCell>
                <TableCell>{s.className}</TableCell>
                <TableCell align="center">{s.subjects}</TableCell>
                <TableCell align="center">
                  {s.subjects > 0 ? `${s.totalObtained} / ${s.totalMax}` : '—'}
                </TableCell>
                <TableCell align="center">
                  {s.fails > 0 ? (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                      {s.fails}
                    </Typography>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
            {studentSummaries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No students in this semester.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}