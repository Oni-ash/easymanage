import { redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import NewNoticeForm from './new-notice-form';

export default async function NewNoticePage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role === 'STUDENT') redirect('/notices');

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        New notice
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Posting as {principal.name}
      </Typography>
      <NewNoticeForm />
    </Box>
  );
}