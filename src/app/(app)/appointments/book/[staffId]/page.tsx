import { notFound, redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import BookingForm from './booking-form';

type Params = Promise<{ staffId: string }>;

export default async function BookAppointmentPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'STUDENT') redirect('/appointments');

  const { staffId } = await params;

  const [staff, slots] = await Promise.all([
    prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true, name: true, role: true, departmentId: true },
    }),
    prisma.availabilitySlot.findMany({
      where: { staffId, isBooked: false, startAt: { gt: new Date() } },
      orderBy: { startAt: 'asc' },
      select: { id: true, startAt: true, endAt: true, location: true },
    }),
  ]);

  if (!staff || (staff.role !== 'HOD' && staff.role !== 'FACULTY')) notFound();

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Book with {staff.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {staff.role}
      </Typography>
      <BookingForm
        staffId={staff.id}
        staffName={staff.name}
        slots={slots.map((s) => ({
          id: s.id,
          startAt: s.startAt.toISOString(),
          endAt: s.endAt.toISOString(),
          location: s.location,
        }))}
      />
    </Box>
  );
}