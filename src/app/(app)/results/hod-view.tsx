import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function HodResults({ principal }: { principal: Principal }) {
  if (!principal.departmentId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Results
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a department.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const exams = await prisma.exam.findMany({
    where: {
      kind: 'INTERNAL',
      departmentId: principal.departmentId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { marks: true } },
    },
  });

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Results
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.department?.name ?? 'Your department'} · Internal exams
      </Typography>

      {exams.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No internal exams yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {exams.map((exam) => (
            <Paper key={exam.id} sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{exam.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {exam.session ?? ''} · Semester {exam.semester} ·{' '}
                    {exam._count.marks} mark{exam._count.marks === 1 ? '' : 's'} entered
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  {exam.publishedAt ? (
                    <Chip label="Published" color="success" size="small" />
                  ) : (
                    <Chip label="Draft" variant="outlined" size="small" />
                  )}
                  <LinkButton
                    href={`/results/exam/${exam.id}`}
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