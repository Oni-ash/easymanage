import { getPrincipal } from '@/lib/principal';
import StudentLeave from './student-view';
import FacultyLeave from './faculty-view';
import HodLeave from './hod-view';

export default async function LeavePage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (principal.role === 'STUDENT') return <StudentLeave principal={principal} />;
  if (principal.role === 'HOD' || principal.role === 'ADMIN') return <HodLeave principal={principal} />;
  return <FacultyLeave principal={principal} />;
}