import { Box, Container, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TestDbPage() {
  const userCount = await prisma.user.count();

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="sm">
        <Stack spacing={2} sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            Database connected
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Users in database: {userCount}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}