import { redirect } from 'next/navigation';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function SetupHomePage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') redirect('/dashboard');

  const isAdmin = principal.role === 'ADMIN';

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Academic setup
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {isAdmin
          ? 'Manage the entire academic structure across the college'
          : `Manage structure for ${principal.department?.name ?? 'your department'}`}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <SetupCard
          title="Subjects"
          description="Add and retire subjects per semester. Mark subjects that have a lab."
          href="/setup/subjects"
        />
        <SetupCard
          title="Teaching assignments"
          description="Assign faculty to teach a subject to a class."
          href="/setup/assignments"
        />
        <SetupCard
          title="Classes"
          description="Create classes, assign their incharge, and set the semester."
          href="/setup/classes"
        />
        {isAdmin && (
          <SetupCard
            title="Departments"
            description="Create departments and assign their HOD."
            href="/setup/departments"
          />
        )}
      </Box>
    </Box>
  );
}

function SetupCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, flexGrow: 1 }}>
        {description}
      </Typography>
      <Box>
        <LinkButton
          href={href}
          variant="contained"
          sx={{ borderRadius: 999, px: 3 }}
        >
          Manage
        </LinkButton>
      </Box>
    </Paper>
  );
}