import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function StudentResults({ principal }: { principal: Principal }) {
  if (!principal.departmentId || !principal.class) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          My results
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a class yet.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const exams = await prisma.exam.findMany({
    where: {
      semester: principal.class.semester,
      OR: [
        { kind: 'INTERNAL', departmentId: principal.departmentId },
        { kind: 'END_SEMESTER' },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          marks: { where: { studentId: principal.id } },
        },
      },
    },
  });

  const published = exams.filter((e) => e.publishedAt);
  const pending = exams.filter((e) => !e.publishedAt);

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
            My results
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {principal.class.name} · Semester {principal.class.semester}
          </Typography>
        </Box>
        <LinkButton
          href="/results/transcript"
          variant="outlined"
          sx={{ borderRadius: 999, px: 3 }}
        >
          View transcript
        </LinkButton>
      </Stack>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Published results
      </Typography>
      {published.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No published results yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          {published.map((exam) => (
            <Paper key={exam.id} sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{exam.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {exam.session ?? ''} · Published {formatDate(exam.publishedAt!)}
                  </Typography>
                </Box>
                <LinkButton
                  href={`/results/report/${exam.id}`}
                  variant="contained"
                  sx={{ borderRadius: 999, px: 3 }}
                >
                  View report
                </LinkButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {pending.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Pending
          </Typography>
          <Stack spacing={1.5}>
            {pending.map((exam) => (
              <Paper key={exam.id} sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{exam.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {exam.session ?? ''}
                    </Typography>
                  </Box>
                  <Chip label="Awaiting publication" variant="outlined" size="small" />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}