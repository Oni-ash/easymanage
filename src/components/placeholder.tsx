import { Box, Paper, Typography } from '@mui/material';

export default function Placeholder({ title }: { title: string }) {
  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
        {title}
      </Typography>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>Coming soon.</Typography>
      </Paper>
    </Box>
  );
}