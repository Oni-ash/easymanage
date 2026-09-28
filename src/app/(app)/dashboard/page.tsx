import { Box, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';

export default async function DashboardPage() {
  const principal = await getPrincipal();
  if (!principal) return null;

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
        Welcome, {principal.name}
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Stack spacing={1.5}>
          <Row label="Role" value={principal.role} />
          <Row label="Username" value={principal.username} />
          <Row label="Email" value={principal.email} />
          {principal.department && (
            <Row
              label="Department"
              value={`${principal.department.name} (${principal.department.code})`}
            />
          )}
          {principal.class && (
            <Row
              label="Class"
              value={`${principal.class.name} — Semester ${principal.class.semester}`}
            />
          )}
          {principal.inchargeOf.length > 0 && (
            <Row
              label="Class incharge of"
              value={principal.inchargeOf.map((c) => c.name).join(', ')}
            />
          )}
          <Row
            label="Permissions"
            value={principal.permissions.length ? principal.permissions.join(', ') : 'None'}
          />
        </Stack>
      </Paper>
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