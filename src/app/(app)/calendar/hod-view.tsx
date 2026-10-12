import { Box, Paper, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import CalendarView, { type CalEvent } from './calendar-view';
import EventManager from './event-manager';

export default async function HodCalendar({ principal }: { principal: Principal }) {
  if (!principal.departmentId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Academic calendar
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a department.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const [events, classes] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        OR: [{ scope: 'COLLEGE' }, { departmentId: principal.departmentId }],
      },
      include: {
        department: { select: { code: true } },
        class: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    }),
    prisma.class.findMany({
      where: { departmentId: principal.departmentId },
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, semester: true },
    }),
  ]);

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

  const manageEvents = events
    .filter((e) => e.scope !== 'COLLEGE')
    .map((e) => ({
      id: e.id,
      title: e.title,
      details: e.details,
      scope: e.scope,
      semester: e.semester,
      classId: e.classId,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() ?? null,
      departmentCode: e.department?.code ?? null,
      className: e.class?.name ?? null,
    }));

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Academic calendar
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.department.name}
      </Typography>

      <Box sx={{ mb: 5 }}>
        <CalendarView events={calEvents} />
      </Box>

      <EventManager events={manageEvents} classes={classes} />
    </Box>
  );
}