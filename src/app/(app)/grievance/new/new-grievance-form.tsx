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
  Typography,
} from '@mui/material';
import { createGrievance } from './actions';

const TYPES = ['Academic', 'Facility', 'Administrative', 'Harassment', 'Other'];

export default function NewGrievanceForm() {
  const router = useRouter();
  const [type, setType] = useState('Academic');
  const [details, setDetails] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.set('type', type);
    fd.set('details', details);
    if (file) fd.set('file', file);

    const result = await createGrievance(fd);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/grievance');
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
            fullWidth
            multiline
            minRows={5}
            placeholder="Describe your grievance. Be specific — include dates, locations, and names if relevant."
          />

          <Button variant="outlined" component="label" sx={{ borderRadius: 999 }}>
            {file ? file.name : 'Attach a file (optional)'}
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Attachments are visible only to staff handling this grievance. Max 20 MB.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => router.push('/grievance')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Submitting…' : 'Submit grievance'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}