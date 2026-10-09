'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { createNotice } from './actions';

type Scope = 'DEPARTMENT' | 'SEMESTER' | 'CLASS';

export default function NewNoticeForm() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('DEPARTMENT');
  const [semester, setSemester] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [important, setImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set('scope', scope);
    if (scope === 'SEMESTER') fd.set('semester', String(semester));
    fd.set('title', title);
    fd.set('body', body);
    if (important) fd.set('important', 'on');

    const result = await createNotice(fd);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/notices');
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Audience</InputLabel>
            <Select
              label="Audience"
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              <MenuItem value="DEPARTMENT">Entire department</MenuItem>
              <MenuItem value="SEMESTER">Specific semester</MenuItem>
              <MenuItem value="CLASS">My class</MenuItem>
            </Select>
          </FormControl>

          {scope === 'SEMESTER' && (
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
          )}

          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            fullWidth
            multiline
            minRows={5}
            placeholder="Write the notice here…"
          />

          <FormControlLabel
            control={
              <Checkbox checked={important} onChange={(e) => setImportant(e.target.checked)} />
            }
            label="Mark as important"
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Students in the selected audience will receive a notification.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => router.push('/notices')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Posting…' : 'Post notice'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}