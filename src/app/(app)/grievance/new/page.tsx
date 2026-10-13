import { redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import NewGrievanceForm from './new-grievance-form';

export default async function NewGrievancePage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'STUDENT') redirect('/grievance');
  if (!principal.departmentId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          New grievance
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          You are not assigned to a department yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        New grievance
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Filed as {principal.name} · {principal.department?.name ?? ''}
      </Typography>
      <NewGrievanceForm />
    </Box>
  );
}