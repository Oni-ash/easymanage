import { redirect } from 'next/navigation';
import { Box, Paper, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import AdminUsers from './admin-view';
import FacultyUsers from './faculty-view';

export default async function UsersPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');

  if (principal.role === 'ADMIN') return <AdminUsers principal={principal} />;
  if (principal.role === 'FACULTY') return <FacultyUsers principal={principal} />;

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
        Users
      </Typography>
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>
          You do not have access to user management.
        </Typography>
      </Paper>
    </Box>
  );
}