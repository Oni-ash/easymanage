import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import SignOutButton from './sign-out-button';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      department: true,
      class: true,
      inchargeOf: true,
    },
  });

  if (!user) redirect('/login');

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', p: 3 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
              Welcome, {user.name}
            </Typography>
            <SignOutButton />
          </Stack>

          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Stack spacing={1.5}>
              <Row label="Role" value={user.role} />
              <Row label="Username" value={user.username} />
              <Row label="Email" value={user.email} />
              {user.department && (
                <Row label="Department" value={`${user.department.name} (${user.department.code})`} />
              )}
              {user.class && (
                <Row label="Class" value={`${user.class.name} — Semester ${user.class.semester}`} />
              )}
              {user.inchargeOf.length > 0 && (
                <Row
                  label="Class incharge of"
                  value={user.inchargeOf.map((c) => c.name).join(', ')}
                />
              )}
              <Row
                label="Permissions"
                value={user.permissions.length ? user.permissions.join(', ') : 'None'}
              />
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography sx={{ fontWeight: 600, minWidth: 180 }}>{label}</Typography>
      <Typography sx={{ color: 'text.secondary' }}>{value}</Typography>
    </Stack>
  );
}