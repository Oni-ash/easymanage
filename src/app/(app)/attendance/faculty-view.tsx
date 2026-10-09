import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function FacultyAttendance({ principal }: { principal: Principal }) {
  const now = new Date();
  const jsDay = now.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  const slots = await prisma.scheduleSlot.findMany({
    where: { dayOfWeek, facultyId: principal.id },
    include: {
      class: { select: { id: true, name: true, semester: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ class: { name: 'asc' } }, { period: 'asc' }],
  });

  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const existingSessions = await prisma.attendanceSession.findMany({
    where: {
      date: todayStart,
      markedById: principal.id,
      subjectId: { in: slots.map((s) => s.subjectId) },
    },
    select: { classId: true, subjectId: true, period: true },
  });
  const marked = new Set(
    existingSessions.map((s) => `${s.classId}-${s.subjectId}-${s.period}`),
  );

  const dateParam = todayStart.toISOString().slice(0, 10);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Attendance
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Your classes for today
      </Typography>

      {slots.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No classes scheduled for you today.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {slots.map((slot) => {
            const key = `${slot.classId}-${slot.subjectId}-${slot.period}`;
            const isMarked = marked.has(key);
            const href = `/attendance/mark?classId=${slot.classId}&subjectId=${slot.subjectId}&period=${slot.period}&date=${dateParam}`;
            return (
              <Paper key={slot.id} sx={{ p: 2, borderRadius: 3 }}>
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
                      {slot.class.name} · Period {slot.period} · {slot.subject.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {slot.subject.code}
                      {slot.room ? ` · Room ${slot.room}` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    {isMarked ? (
                      <Chip label="Marked" color="success" size="small" />
                    ) : (
                      <Chip label="Not marked" variant="outlined" size="small" />
                    )}
                    <LinkButton
                      href={href}
                      variant={isMarked ? 'outlined' : 'contained'}
                      sx={{ borderRadius: 999, px: 3 }}
                    >
                      {isMarked ? 'Edit' : 'Mark'}
                    </LinkButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}