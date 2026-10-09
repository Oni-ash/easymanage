import { getPrincipal } from '@/lib/principal';
import StudentAttendance from './student-view';
import FacultyAttendance from './faculty-view';
import HodAttendance from './hod-view';

export default async function AttendancePage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (principal.role === 'STUDENT') {
    return <StudentAttendance principal={principal} />;
  }
  if (principal.role === 'HOD' || principal.role === 'ADMIN') {
    return <HodAttendance principal={principal} />;
  }
  return <FacultyAttendance principal={principal} />;
}