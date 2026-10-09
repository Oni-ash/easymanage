import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function HodAttendance({ principal }: { principal: Principal }) {
  if (!principal.departmentId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Attendance
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a department.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const classes = await prisma.class.findMany({
    where: { departmentId: principal.departmentId },
    orderBy: [{ semester: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { students: true } },
      incharge: { select: { name: true } },
    },
  });

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  // For each class, count how many sessions were marked today
  const sessionCounts = await Promise.all(
    classes.map((c) =>
      prisma.attendanceSession.count({
        where: { classId: c.id, date: todayStart },
      }),
    ),
  );

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Attendance
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Classes in {principal.department?.name ?? 'your department'}
      </Typography>

      {classes.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No classes in your department yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {classes.map((c, i) => (
            <Paper key={c.id} sx={{ p: 2, borderRadius: 3 }}>
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
                    {c.name} · Semester {c.semester}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {c._count.students} students
                    {c.incharge ? ` · Incharge: ${c.incharge.name}` : ' · No incharge'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Chip
                    label={sessionCounts[i] > 0 ? `${sessionCounts[i]} marked today` : 'Nothing marked today'}
                    color={sessionCounts[i] > 0 ? 'success' : 'default'}
                    variant={sessionCounts[i] > 0 ? 'filled' : 'outlined'}
                    size="small"
                  />
                  <LinkButton
                    href={`/attendance/class/${c.id}`}
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