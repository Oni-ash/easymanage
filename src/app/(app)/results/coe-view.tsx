import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function CoeResults({ principal }: { principal: Principal }) {
  const exams = await prisma.exam.findMany({
    where: { kind: 'END_SEMESTER' },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { marks: true } },
    },
  });

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            Examination management
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            End-semester exams · {principal.role === 'COE' ? 'Controller of Examinations' : principal.role}
          </Typography>
        </Box>
        <LinkButton
          href="/results/coe/new"
          variant="contained"
          sx={{ borderRadius: 999, px: 3 }}
        >
          New exam
        </LinkButton>
      </Stack>

      {exams.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No end-semester exams yet. Create one to begin.
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
                    {exam.session ?? ''} · Semester {exam.semester} · {exam._count.marks} mark
                    {exam._count.marks === 1 ? '' : 's'} entered
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  {exam.publishedAt ? (
                    <Chip label="Published" color="success" size="small" />
                  ) : (
                    <Chip label="Draft" variant="outlined" size="small" />
                  )}
                  <LinkButton
                    href={`/results/coe/${exam.id}`}
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