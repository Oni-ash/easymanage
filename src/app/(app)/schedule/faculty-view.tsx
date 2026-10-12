import { Box, Divider, Paper, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import ScheduleGrid from './schedule-grid';

export default async function FacultySchedule({ principal }: { principal: Principal }) {
  const [ownSlots, inchargeClasses] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { facultyId: principal.id },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
      },
    }),
    prisma.class.findMany({
      where: { inchargeId: principal.id },
      select: { id: true, name: true, semester: true },
    }),
  ]);

  const inchargeSlotsByClass = await Promise.all(
    inchargeClasses.map(async (c) => ({
      cls: c,
      slots: await prisma.scheduleSlot.findMany({
        where: { classId: c.id },
        include: {
          subject: { select: { name: true, code: true } },
          faculty: { select: { name: true } },
        },
      }),
    })),
  );

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Weekly schedule
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Your teaching week and the classes you are incharge of
      </Typography>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Your teaching schedule
      </Typography>
      {ownSlots.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No classes assigned to you yet.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ mb: 4 }}>
          <ScheduleGrid slots={ownSlots} />
        </Box>
      )}

      {inchargeSlotsByClass.map(({ cls, slots }) => (
        <Box key={cls.id} sx={{ mb: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {cls.name} (incharge)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Semester {cls.semester}
          </Typography>
          <ScheduleGrid slots={slots} />
        </Box>
      ))}
    </Box>
  );
}