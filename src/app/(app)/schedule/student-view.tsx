import { Box, Paper, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import ScheduleGrid from './schedule-grid';

export default async function StudentSchedule({ principal }: { principal: Principal }) {
  if (!principal.classId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Weekly schedule
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a class yet.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const [cls, slots] = await Promise.all([
    prisma.class.findUnique({
      where: { id: principal.classId },
      select: { name: true, semester: true },
    }),
    prisma.scheduleSlot.findMany({
      where: { classId: principal.classId },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
      },
    }),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Weekly schedule
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {cls?.name} · Semester {cls?.semester}
      </Typography>
      <ScheduleGrid slots={slots} />
    </Box>
  );
}