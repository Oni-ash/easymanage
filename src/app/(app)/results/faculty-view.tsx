import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function FacultyResults({ principal }: { principal: Principal }) {
  // All internal exams in this faculty's department
  const exams = await prisma.exam.findMany({
    where: {
      kind: 'INTERNAL',
      departmentId: principal.departmentId ?? undefined,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      department: { select: { code: true } },
    },
  });

  // For each exam, find which (subject, class) pairs this faculty can enter marks for
  const teaching = await prisma.teachingAssignment.findMany({
    where: { facultyId: principal.id },
    include: {
      subject: { select: { id: true, name: true, code: true, hasPractical: true } },
      class: { select: { id: true, name: true, semester: true } },
    },
  });

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Results
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Internal exam mark entry
      </Typography>

      {exams.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No internal exams yet. Your HOD will create them.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {exams.map((exam) => {
            // Filter teaching pairs to subjects at this exam's semester
            const applicable = teaching.filter((t) => t.class.semester === exam.semester);

            return (
              <Box key={exam.id}>
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
                      {exam.department ? ` · ${exam.department.code}` : ''}
                    </Typography>
                  </Box>
                  {exam.publishedAt ? (
                    <Chip label="Published" color="success" size="small" />
                  ) : (
                    <Chip label="Not published" variant="outlined" size="small" />
                  )}
                </Stack>

                {applicable.length === 0 ? (
                  <Paper sx={{ p: 3, borderRadius: 4 }}>
                    <Typography sx={{ color: 'text.secondary' }}>
                      You don&apos;t teach any subjects for this exam.
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={1.5}>
                    {applicable.map((t) => (
                      <Paper key={t.id} sx={{ p: 2.5, borderRadius: 3 }}>
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
                              {t.subject.code} · {t.subject.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {t.class.name} · Semester {t.class.semester}
                              {t.subject.hasPractical ? ' · has lab' : ''}
                            </Typography>
                          </Box>
                          <LinkButton
                            href={`/results/enter/${exam.id}/${t.subject.id}/${t.class.id}`}
                            variant="contained"
                            sx={{ borderRadius: 999, px: 3 }}
                          >
                            Enter marks
                          </LinkButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}