import { notFound, redirect } from 'next/navigation';
import { Box, Paper, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import ScheduleGrid from '../../schedule-grid';

type Params = Promise<{ facultyId: string }>;

export default async function FacultySchedulePage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');

  const { facultyId } = await params;

  const faculty = await prisma.user.findUnique({
    where: { id: facultyId },
    select: { id: true, name: true, username: true, role: true, departmentId: true },
  });
  if (!faculty || faculty.role !== 'FACULTY') notFound();

  // Viewer permission: HOD/ADMIN of the same dept, or the faculty themselves
  const canView =
    principal.role === 'ADMIN' ||
    (principal.role === 'HOD' && principal.departmentId === faculty.departmentId) ||
    principal.id === faculty.id;
  if (!canView) notFound();

  const slots = await prisma.scheduleSlot.findMany({
    where: { facultyId },
    include: {
      subject: { select: { name: true, code: true } },
      faculty: { select: { name: true } },
    },
  });

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {faculty.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {faculty.username} · Weekly teaching schedule
      </Typography>

      {slots.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No classes assigned to this faculty yet.
          </Typography>
        </Paper>
      ) : (
        <ScheduleGrid slots={slots} />
      )}
    </Box>
  );
}