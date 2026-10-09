import { redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import NewLeaveForm from './new-leave-form';

export default async function NewLeavePage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'STUDENT') redirect('/leave');
  if (!principal.class) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          New leave request
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          You are not assigned to a class yet. Contact your department office.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        New leave request
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Submitting as {principal.name} · {principal.class.name} · Semester {principal.class.semester}
      </Typography>
      <NewLeaveForm />
    </Box>
  );
}