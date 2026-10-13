import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function StudentGrievance({ principal }: { principal: Principal }) {
  const grievances = await prisma.grievance.findMany({
    where: { studentId: principal.id },
    orderBy: { createdAt: 'desc' },
    include: {
      assignedTo: { select: { name: true } },
    },
  });

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            My grievances
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            File a grievance and track its status
          </Typography>
        </Box>
        <LinkButton
          href="/grievance/new"
          variant="contained"
          sx={{ borderRadius: 999, px: 3 }}
        >
          New grievance
        </LinkButton>
      </Stack>

      {grievances.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You haven&apos;t filed any grievances yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {grievances.map((g) => (
            <Paper key={g.id} sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label={g.type} size="small" variant="outlined" />
                    <StatusChip status={g.status} />
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Filed {formatDate(g.createdAt)}
                  </Typography>
                </Stack>

                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {g.details}
                </Typography>

                {g.assignedTo && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Handling: {g.assignedTo.name}
                  </Typography>
                )}

                <Divider />

                <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                  <LinkButton
                    href={`/grievance/${g.id}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 999 }}
                  >
                    View
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

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING') return <Chip label="Pending" color="warning" size="small" />;
  if (status === 'IN_PROGRESS') return <Chip label="In progress" color="info" size="small" />;
  if (status === 'RESOLVED') return <Chip label="Resolved" color="success" size="small" />;
  return <Chip label={status} size="small" />;
}