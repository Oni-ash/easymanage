import { getPrincipal } from '@/lib/principal';
import StudentCalendar from './student-view';
import FacultyCalendar from './faculty-view';
import HodCalendar from './hod-view';

export default async function CalendarPage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (principal.role === 'STUDENT') return <StudentCalendar principal={principal} />;
  if (principal.role === 'HOD' || principal.role === 'ADMIN')
    return <HodCalendar principal={principal} />;
  return <FacultyCalendar principal={principal} />;
}