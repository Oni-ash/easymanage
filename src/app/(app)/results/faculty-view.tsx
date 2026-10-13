import { Box, Paper, Typography } from '@mui/material';
import type { Principal } from '@/lib/principal';

export default async function FacultyResults({ principal }: { principal: Principal }) {
  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Results
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Mark entry for your subjects
      </Typography>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>
          Internal exam mark entry will appear here.
        </Typography>
      </Paper>
    </Box>
  );
}