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
import { createDepartment } from './actions';

type Hod = { id: string; name: string; departmentId: string | null };

export default function DepartmentForm({ hodCandidates }: { hodCandidates: Hod[] }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [hodId, setHodId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await createDepartment({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      hodId: hodId || null,
    });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setCode('');
    setName('');
    setHodId('');
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Add a new department
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              fullWidth
              placeholder="e.g. MECH"
            />
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="e.g. Mechanical Engineering"
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel>HOD (optional)</InputLabel>
            <Select
              label="HOD (optional)"
              value={hodId}
              onChange={(e) => setHodId(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {hodCandidates.map((h) => (
                <MenuItem key={h.id} value={h.id}>
                  {h.name}
                  {h.departmentId ? ' (already HOD of another dept)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Creating…' : 'Create department'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}