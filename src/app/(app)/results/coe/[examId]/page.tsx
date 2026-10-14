import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import LinkButton from '../../link-button';
import PublishButton from './publish-button';

type Params = Promise<{ examId: string }>;

export default async function CoeExamDetailPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (
    principal.role !== 'COE' &&
    principal.role !== 'COE_STAFF' &&
    principal.role !== 'ADMIN'
  ) {
    redirect('/results');
  }

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || exam.kind !== 'END_SEMESTER') notFound();

  // All classes at this semester, across all departments
  const classes = await prisma.class.findMany({
    where: { semester: exam.semester },
    orderBy: [{ department: { code: 'asc' } }, { name: 'asc' }],
    include: {
      department: { select: { code: true, name: true } },
      students: { where: { role: 'STUDENT', active: true }, select: { id: true } },
    },
  });

  // All subjects at this semester
  const subjects = await prisma.subject.findMany({
    where: { semester: exam.semester },
    orderBy: [{ departmentId: 'asc' }, { code: 'asc' }],
    select: { id: true, code: true, name: true, departmentId: true, hasPractical: true },
  });

  // All marks for this exam
  const marks = await prisma.examMark.findMany({
    where: { examId },
    select: { studentId: true, subjectId: true },
  });

  const markSet = new Set(marks.map((m) => `${m.studentId}::${m.subjectId}`));
  const subjectsByDept = new Map<string, typeof subjects>();
  for (const s of subjects) {
    const arr = subjectsByDept.get(s.departmentId) ?? [];
    arr.push(s);
    subjectsByDept.set(s.departmentId, arr);
  }

  type ClassRow = {
    classId: string;
    className: string;
    departmentCode: string;
    studentCount: number;
    subjects: Array<{
      subjectId: string;
      code: string;
      filled: number;
      total: number;
      complete: boolean;
    }>;
    complete: boolean;
  };

  const rows: ClassRow[] = classes.map((c) => {
    const deptSubjects = subjectsByDept.get(c.departmentId) ?? [];
    const subjectRows = deptSubjects.map((s) => {
      const total = c.students.length;
      const filled = c.students.filter((st) => markSet.has(`${st.id}::${s.id}`)).length;
      return {
        subjectId: s.id,
        code: s.code,
        filled,
        total,
        complete: filled === total && total > 0,
      };
    });
    return {
      classId: c.id,
      className: c.name,
      departmentCode: c.department.code,
      studentCount: c.students.length,
      subjects: subjectRows,
      complete: subjectRows.length > 0 && subjectRows.every((r) => r.complete),
    };
  });

  const allComplete = rows.length > 0 && rows.every((r) => r.complete);
  const completeRowCount = rows.filter((r) => r.complete).length;

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {exam.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {exam.session ?? ''} · Semester {exam.semester} · College-wide
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        {exam.publishedAt ? (
          <Chip label="Published" color="success" />
        ) : (
          <Chip label="Draft" variant="outlined" />
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {completeRowCount} / {rows.length} classes complete
        </Typography>
      </Stack>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Mark entry status
      </Typography>

      {rows.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No classes found at semester {exam.semester}.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2} sx={{ mb: 4 }}>
          {rows.map((r) => (
            <Paper key={r.classId} sx={{ p: 2, borderRadius: 3 }}>
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
              >
                <Typography sx={{ fontWeight: 600 }}>
                  {r.departmentCode} · {r.className}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {r.studentCount} student{r.studentCount === 1 ? '' : 's'}
                </Typography>
              </Stack>
              {r.subjects.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No subjects defined for this department at this semester.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {r.subjects.map((s) => (
                    <Stack
                      key={s.subjectId}
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: s.complete ? 'success.light' : 'warning.light',
                        color: s.complete ? 'success.contrastText' : 'warning.contrastText',
                        gap: 2,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
                        {s.code}
                      </Typography>
                      <Typography variant="body2">
                        {s.filled} / {s.total}
                      </Typography>
                      <LinkButton
                        href={`/results/enter/${exam.id}/${s.subjectId}/${r.classId}`}
                        size="small"
                        variant="contained"
                        color={s.complete ? 'success' : 'warning'}
                        sx={{ borderRadius: 999, px: 2, ml: 2 }}
                      >
                        {s.complete ? 'View' : 'Enter'}
                      </LinkButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Publish
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {exam.publishedAt
            ? `Published on ${exam.publishedAt.toLocaleString('en-IN')}. Marks are now visible to students and locked.`
            : allComplete
              ? 'All marks entered. You can publish the results now.'
              : 'All classes must be complete before publishing.'}
        </Typography>
        {!exam.publishedAt && principal.role !== 'COE_STAFF' && (
          <PublishButton examId={exam.id} disabled={!allComplete} />
        )}
        {!exam.publishedAt && principal.role === 'COE_STAFF' && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Only the COE can publish. Staff can enter marks.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}