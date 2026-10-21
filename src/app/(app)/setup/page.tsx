import { redirect } from 'next/navigation';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function SetupHomePage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') redirect('/dashboard');

  const canManageAll = principal.role === 'ADMIN';

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Academic setup
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {canManageAll
          ? 'Manage subjects and teaching assignments across the college'
          : `Manage subjects and teaching assignments for ${principal.department?.name ?? 'your department'}`}
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: 'stretch' }}
      >
        <Paper sx={{ p: 3, borderRadius: 4, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Subjects
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Add and retire subjects per semester. Mark subjects that have a lab.
          </Typography>
          <LinkButton
            href="/setup/subjects"
            variant="contained"
            sx={{ borderRadius: 999, px: 3 }}
          >
            Manage subjects
          </LinkButton>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 4, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Teaching assignments
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Assign faculty to teach a subject to a class.
          </Typography>
          <LinkButton
            href="/setup/assignments"
            variant="contained"
            sx={{ borderRadius: 999, px: 3 }}
          >
            Manage assignments
          </LinkButton>
        </Paper>
      </Stack>
    </Box>
  );
}