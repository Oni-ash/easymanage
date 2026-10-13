import { getPrincipal } from '@/lib/principal';
import StudentAppointments from './student-view';
import StaffAppointments from './staff-view';

export default async function AppointmentsPage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (principal.role === 'STUDENT') {
    return <StudentAppointments principal={principal} />;
  }

  // FACULTY, HOD, ADMIN can define slots and receive requests
  return <StaffAppointments principal={principal} />;
}