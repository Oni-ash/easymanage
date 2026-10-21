'use client';

import { useMemo, useState } from 'react';
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
import { createClass } from './actions';

type Department = { id: string; name: string; code: string };
type Faculty = { id: string; name: string; departmentId: string | null };

export default function ClassForm({
  isAdmin,
  departments,
  faculty,
  defaultDepartmentId,
}: {
  isAdmin: boolean;
  departments: Department[];
  faculty: Faculty[];
  defaultDepartmentId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [semester, setSemester] = useState(1);
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || departments[0]?.id || '');
  const [inchargeId, setInchargeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableFaculty = useMemo(() => {
    if (isAdmin && departmentId) {
      return faculty.filter((f) => f.departmentId === departmentId);
    }
    return faculty;
  }, [faculty, departmentId, isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await createClass({
      name: name.trim(),
      semester,
      departmentId: isAdmin ? departmentId : null,
      inchargeId: inchargeId || null,
    });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setName('');
    setInchargeId('');
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Add a new class
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {isAdmin && (
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                label="Department"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setInchargeId('');
                }}
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
              label="Class name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="e.g. CSE-4A"
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
          </Stack>

          <FormControl fullWidth>
            <InputLabel>Class incharge (optional)</InputLabel>
            <Select
              label="Class incharge (optional)"
              value={inchargeId}
              onChange={(e) => setInchargeId(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {availableFaculty.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
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
              {submitting ? 'Creating…' : 'Create class'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}