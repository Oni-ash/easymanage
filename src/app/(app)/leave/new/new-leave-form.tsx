'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { submitLeaveRequest } from './actions';

export default function NewLeaveForm() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.set('fromDate', fromDate);
    fd.set('toDate', toDate);
    fd.set('body', body);

    const result = await submitLeaveRequest(fd);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/leave');
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="From"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
            <TextField
              label="To"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
          </Stack>

          <TextField
            label="Reason"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            minRows={4}
            required
            fullWidth
            placeholder="Explain the reason for your leave…"
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => router.push('/leave')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}