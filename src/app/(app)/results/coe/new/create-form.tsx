'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { createEndSemExam } from './actions';

export default function CreateExamForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createEndSemExam({ name, session, semester });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.push('/results');
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Exam name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            placeholder="e.g. End Semester Exam — November 2026"
          />

          <TextField
            label="Session"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            fullWidth
            placeholder="e.g. 2026-27 Odd"
            helperText="Academic session identifier. Used to group exams by year and term."
          />

          <FormControl fullWidth>
            <InputLabel>Semester</InputLabel>
            <Select
              label="Semester"
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <MenuItem key={s} value={s}>
                  Semester {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => router.push('/results')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Creating…' : 'Create exam'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}