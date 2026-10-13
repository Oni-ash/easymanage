import { getPrincipal } from '@/lib/principal';
import StudentResults from './student-view';
import FacultyResults from './faculty-view';
import HodResults from './hod-view';
import CoeResults from './coe-view';

export default async function ResultsPage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (principal.role === 'STUDENT') return <StudentResults principal={principal} />;
  if (principal.role === 'COE' || principal.role === 'COE_STAFF') {
    return <CoeResults principal={principal} />;
  }
  if (principal.role === 'HOD' || principal.role === 'ADMIN') {
    return <HodResults principal={principal} />;
  }
  return <FacultyResults principal={principal} />;
}