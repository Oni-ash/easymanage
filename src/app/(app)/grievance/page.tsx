import { Box, Paper, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import StudentGrievance from './student-view';
import StaffGrievance from './staff-view';

export default async function GrievancePage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  if (principal.role === 'STUDENT') {
    return <StudentGrievance principal={principal} />;
  }

  const canView =
    principal.role === 'HOD' ||
    principal.role === 'ADMIN' ||
    (principal.role === 'FACULTY' &&
      (principal.permissions as string[]).includes('GRIEVANCE'));

  if (!canView) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Grievance
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You do not have access to the grievance section. Contact your HOD.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return <StaffGrievance principal={principal} />;
}