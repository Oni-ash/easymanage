'use client';

import { useState } from 'react';
import {
  Box, Button, Container, Divider, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ mode, name, email, username, password });
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 4,
            p: { xs: 3, sm: 4 },
            boxShadow: 2,
          }}
        >
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
              Welcome to EasyManage
            </Typography>

            <Tabs
              value={mode}
              onChange={(_, v) => setMode(v as Mode)}
              variant="fullWidth"
            >
              <Tab label="Sign in" value="signin" />
              <Tab label="Create account" value="signup" />
            </Tabs>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {mode === 'signup' && (
                  <>
                    <TextField
                      label="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      fullWidth
                      required
                    />
                  </>
                )}

                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{ borderRadius: 999, py: 1.3, mt: 1 }}
                >
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Button>
              </Stack>
            </Box>

            <Divider>or</Divider>

            <Stack spacing={1.5}>
              <Button
                variant="outlined"
                size="large"
                sx={{ borderRadius: 999 }}
                onClick={() => console.log('google')}
              >
                Continue with Google
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{ borderRadius: 999 }}
                onClick={() => console.log('github')}
              >
                Continue with GitHub
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}