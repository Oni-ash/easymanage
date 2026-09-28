'use client';

import { Button } from '@mui/material';
import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  return (
    <Button
      variant="outlined"
      onClick={() => signOut({ callbackUrl: '/login' })}
      sx={{ borderRadius: 999 }}
    >
      Sign out
    </Button>
  );
}