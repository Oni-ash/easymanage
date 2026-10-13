import { Box, Paper, Typography } from '@mui/material';
import type { Principal } from '@/lib/principal';

export default async function CoeResults({ principal }: { principal: Principal }) {
  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Examination management
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.role === 'COE' ? 'Controller of Examinations' : 'COE cell staff'}
      </Typography>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>
          End-semester exam setup, marks entry, and publishing will appear here.
        </Typography>
      </Paper>
    </Box>
  );
}