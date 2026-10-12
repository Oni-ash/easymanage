import { Box, Paper, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import CalendarView, { type CalEvent } from './calendar-view';

export default async function FacultyCalendar({ principal }: { principal: Principal }) {
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

  const taught = await prisma.teachingAssignment.findMany({
    where: { facultyId: principal.id },
    select: { classId: true },
  });

  const classIds = Array.from(
    new Set([
      ...taught.map((t) => t.classId),
      ...principal.inchargeOf.map((c) => c.id),
    ]),
  );

  const ors: object[] = [
    { scope: 'COLLEGE' },
    { scope: 'DEPARTMENT', departmentId: principal.departmentId },
    { scope: 'SEMESTER', departmentId: principal.departmentId },
  ];
  if (classIds.length > 0) {
    ors.push({ scope: 'CLASS', classId: { in: classIds } });
  }

  const events = await prisma.calendarEvent.findMany({
    where: { OR: ors },
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
        {principal.department.name}
      </Typography>
      <CalendarView events={calEvents} />
    </Box>
  );
}