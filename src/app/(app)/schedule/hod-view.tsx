import { Box, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function HodSchedule({ principal }: { principal: Principal }) {
  if (!principal.departmentId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Weekly schedules
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a department.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const [classes, faculty] = await Promise.all([
    prisma.class.findMany({
      where: { departmentId: principal.departmentId },
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { schedule: true } },
        incharge: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { departmentId: principal.departmentId, role: 'FACULTY', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true },
    }),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Weekly schedules
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.department?.name ?? 'Your department'}
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Class schedules
      </Typography>
      <Stack spacing={1.5} sx={{ mb: 4 }}>
        {classes.map((c) => (
          <Paper key={c.id} sx={{ p: 2, borderRadius: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600 }}>
                  {c.name} · Semester {c.semester}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {c._count.schedule} slot{c._count.schedule === 1 ? '' : 's'}
                  {c.incharge ? ` · Incharge: ${c.incharge.name}` : ''}
                </Typography>
              </Box>
              <LinkButton
                href={`/schedule/class/${c.id}`}
                variant="contained"
                sx={{ borderRadius: 999, px: 3 }}
              >
                Open
              </LinkButton>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Faculty schedules
      </Typography>
      <Stack spacing={1.5}>
        {faculty.map((f) => (
          <Paper key={f.id} sx={{ p: 2, borderRadius: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{f.name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {f.username}
                </Typography>
              </Box>
              <LinkButton
                href={`/schedule/faculty/${f.id}`}
                variant="outlined"
                sx={{ borderRadius: 999, px: 3 }}
              >
                View week
              </LinkButton>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}