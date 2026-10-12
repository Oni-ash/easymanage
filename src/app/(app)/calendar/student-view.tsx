import { Box, Paper, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import CalendarView, { type CalEvent } from './calendar-view';

export default async function StudentCalendar({ principal }: { principal: Principal }) {
  if (!principal.departmentId || !principal.class) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Academic calendar
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a class yet.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      OR: [
        { scope: 'COLLEGE' },
        { scope: 'DEPARTMENT', departmentId: principal.departmentId },
        {
          scope: 'SEMESTER',
          departmentId: principal.departmentId,
          semester: principal.class.semester,
        },
        { scope: 'CLASS', classId: principal.class.id },
      ],
    },
    include: {
      department: { select: { code: true } },
      class: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { startAt: 'asc' },
  });

  const calEvents: CalEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    details: e.details,
    scope: e.scope,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    departmentCode: e.department?.code ?? null,
    className: e.class?.name ?? null,
    semester: e.semester,
    createdByName: e.createdBy.name,
  }));

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Academic calendar
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.department.name} · Semester {principal.class.semester}
      </Typography>
      <CalendarView events={calEvents} />
    </Box>
  );
}