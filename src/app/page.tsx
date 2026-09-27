'use client';

import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Stack
  spacing={3}
  sx={{ alignItems: 'center', textAlign: 'center' }}
>
          <Typography variant="h2" color="primary" sx={{ fontWeight: 700 }}>
            EasyManage
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Attendance, leaves, materials, notices — all in one place.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/login')}
            sx={{ px: 5, py: 1.5, borderRadius: 999 }}
          >
            Get started
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}