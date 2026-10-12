import { notFound, redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import ScheduleGrid from '../../schedule-grid';
import EditDialog from './edit-dialog';

type Params = Promise<{ classId: string }>;

export default async function ClassSchedulePage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      department: { select: { id: true, name: true, code: true } },
      incharge: { select: { name: true } },
    },
  });
  if (!cls) notFound();

  // Who can view?
  const canView =
    principal.role === 'ADMIN' ||
    (principal.role === 'HOD' && principal.departmentId === cls.departmentId) ||
    (principal.role === 'FACULTY' &&
      principal.inchargeOf.some((c) => c.id === classId)) ||
    (principal.role === 'STUDENT' && principal.classId === classId);
  if (!canView) notFound();

  const canEdit = principal.role === 'ADMIN' || (principal.role === 'HOD' && principal.departmentId === cls.departmentId);

  const [slots, subjects, facultyList] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { classId },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
      },
    }),
    canEdit
      ? prisma.subject.findMany({
          where: { departmentId: cls.departmentId },
          orderBy: { code: 'asc' },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve([]),
    canEdit
      ? prisma.user.findMany({
          where: { departmentId: cls.departmentId, role: 'FACULTY', active: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {cls.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {cls.department.name} · Semester {cls.semester}
        {cls.incharge ? ` · Incharge: ${cls.incharge.name}` : ''}
      </Typography>

      {canEdit && (
        <Box sx={{ mb: 3 }}>
          <EditDialog
            classId={classId}
            slots={slots.map((s) => ({
              id: s.id,
              dayOfWeek: s.dayOfWeek,
              period: s.period,
              subjectId: s.subjectId,
              facultyId: s.facultyId,
              room: s.room,
            }))}
            subjects={subjects}
            faculty={facultyList}
          />
        </Box>
      )}

      <ScheduleGrid slots={slots} />
    </Box>
  );
}