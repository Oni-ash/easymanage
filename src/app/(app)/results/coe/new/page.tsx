import { redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import CreateExamForm from './create-form';

export default async function NewExamPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'COE' && principal.role !== 'ADMIN') redirect('/results');

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        New end-semester exam
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Created college-wide. Marks are entered by COE staff and published here.
      </Typography>
      <CreateExamForm />
    </Box>
  );
}