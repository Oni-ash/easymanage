import { Box, Paper, Typography } from '@mui/material';
import type { Principal } from '@/lib/principal';

export default async function StudentResults({ principal }: { principal: Principal }) {
  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        My results
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.name} · {principal.class?.name ?? 'No class'}
      </Typography>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>
          Your exam results, transcript, and backlog status will appear here.
        </Typography>
      </Paper>
    </Box>
  );
}