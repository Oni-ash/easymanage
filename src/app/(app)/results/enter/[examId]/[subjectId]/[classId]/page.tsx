import { notFound, redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import EntryForm from './entry-form';

type Params = Promise<{ examId: string; subjectId: string; classId: string }>;

export default async function MarkEntryPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'FACULTY') redirect('/results');

  const { examId, subjectId, classId } = await params;

  const [exam, subject, cls, students] = await Promise.all([
    prisma.exam.findUnique({ where: { id: examId } }),
    prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, code: true, name: true, hasPractical: true },
    }),
    prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, semester: true },
    }),
    prisma.user.findMany({
      where: { classId, role: 'STUDENT', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true },
    }),
  ]);

  if (!exam || !subject || !cls) notFound();
  if (exam.kind !== 'INTERNAL') notFound();
  if (exam.semester !== cls.semester) notFound();

  const marks = await prisma.examMark.findMany({
    where: { examId, subjectId, studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true, theoryMarks: true, practicalMarks: true },
  });

  // Verify the principal teaches this subject to this class
  const teaches = await prisma.teachingAssignment.findFirst({
    where: { facultyId: principal.id, subjectId, classId },
  });
  if (!teaches) notFound();

  const initial: Record<string, { theory: string; practical: string }> = {};
  for (const m of marks) {
    initial[m.studentId] = {
      theory: m.theoryMarks != null ? String(m.theoryMarks) : '',
      practical: m.practicalMarks != null ? String(m.practicalMarks) : '',
    };
  }

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Enter marks
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {exam.name} · {subject.code} · {cls.name}
      </Typography>
      <EntryForm
        examId={examId}
        subjectId={subjectId}
        classId={classId}
        hasPractical={subject.hasPractical}
        students={students}
        initial={initial}
      />
    </Box>
  );
}