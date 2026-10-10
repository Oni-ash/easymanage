import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import { getPrincipal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function MaterialsPage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  const subjects = await loadSubjects(principal);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Materials
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.role === 'STUDENT'
          ? 'Study material for your semester'
          : principal.role === 'HOD'
            ? 'All subjects in your department'
            : 'Subjects you teach'}
      </Typography>

      {subjects.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            {principal.role === 'STUDENT' && !principal.class
              ? 'You are not assigned to a class yet.'
              : 'No subjects to show.'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {subjects.map((s) => (
            <Paper key={s.id} sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {s.code} · {s.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Semester {s.semester}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Chip
                    label={
                      s._count.materials === 0
                        ? 'No materials yet'
                        : `${s._count.materials} ${s._count.materials === 1 ? 'file' : 'files'}`
                    }
                    size="small"
                    variant={s._count.materials === 0 ? 'outlined' : 'filled'}
                    color={s._count.materials === 0 ? 'default' : 'primary'}
                  />
                  <LinkButton
                    href={`/materials/${s.id}`}
                    variant="contained"
                    sx={{ borderRadius: 999, px: 3 }}
                  >
                    Open
                  </LinkButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

async function loadSubjects(principal: {
  role: string;
  id: string;
  departmentId: string | null;
  class: { semester: number } | null;
}) {
  const { prisma } = await import('@/lib/db');

  if (principal.role === 'STUDENT') {
    if (!principal.departmentId || !principal.class) return [];
    return prisma.subject.findMany({
      where: {
        departmentId: principal.departmentId,
        semester: principal.class.semester,
      },
      orderBy: { code: 'asc' },
      include: { _count: { select: { materials: true } } },
    });
  }

  if (principal.role === 'HOD' || principal.role === 'ADMIN') {
    if (!principal.departmentId) return [];
    return prisma.subject.findMany({
      where: { departmentId: principal.departmentId },
      orderBy: [{ semester: 'asc' }, { code: 'asc' }],
      include: { _count: { select: { materials: true } } },
    });
  }

  // Faculty: only subjects they teach
  const assignments = await prisma.teachingAssignment.findMany({
    where: { facultyId: principal.id },
    select: { subjectId: true },
  });
  const subjectIds = Array.from(new Set(assignments.map((a) => a.subjectId)));
  if (subjectIds.length === 0) return [];

  return prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    orderBy: [{ semester: 'asc' }, { code: 'asc' }],
    include: { _count: { select: { materials: true } } },
  });
}