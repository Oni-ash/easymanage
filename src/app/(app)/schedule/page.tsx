import { getPrincipal } from '@/lib/principal';
import StudentSchedule from './student-view';
import FacultySchedule from './faculty-view';
import HodSchedule from './hod-view';

export default async function SchedulePage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (principal.role === 'STUDENT') return <StudentSchedule principal={principal} />;
  if (principal.role === 'HOD' || principal.role === 'ADMIN') return <HodSchedule principal={principal} />;
  return <FacultySchedule principal={principal} />;
}