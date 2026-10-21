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
import { createSubject } from './actions';

type Department = { id: string; name: string; code: string };

export default function SubjectForm({
  isAdmin,
  departments,
}: {
  isAdmin: boolean;
  departments: Department[];
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState(1);
  const [hasPractical, setHasPractical] = useState(false);
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createSubject({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      semester,
      hasPractical,
      departmentId: isAdmin ? departmentId : null,
    });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setCode('');
    setName('');
    setHasPractical(false);
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Add a new subject
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {isAdmin && (
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              fullWidth
              placeholder="e.g. CS601"
            />
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="e.g. Operating Systems"
            />
          </Stack>

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

          <FormControlLabel
            control={
              <Checkbox
                checked={hasPractical}
                onChange={(e) => setHasPractical(e.target.checked)}
              />
            }
            label="This subject has a lab (theory out of 90, practical out of 10)"
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Adding…' : 'Add subject'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}