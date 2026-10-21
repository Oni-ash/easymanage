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
  Typography,
} from '@mui/material';
import { createAssignment } from './actions';

type Faculty = { id: string; name: string; username: string };
type Subject = { id: string; code: string; name: string; semester: number };
type Class = { id: string; name: string; semester: number };

export default function AssignmentForm({
  faculty,
  subjects,
  classes,
}: {
  faculty: Faculty[];
  subjects: Subject[];
  classes: Class[];
}) {
  const router = useRouter();
  const [facultyId, setFacultyId] = useState(faculty[0]?.id ?? '');
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === classId);

  // Filter subjects to those in the same semester as the selected class
  const availableSubjects = useMemo(() => {
    if (!selectedClass) return subjects;
    return subjects.filter((s) => s.semester === selectedClass.semester);
  }, [subjects, selectedClass]);

  // Keep subjectId valid when class changes
  const resolvedSubjectId = useMemo(() => {
    if (availableSubjects.some((s) => s.id === subjectId)) return subjectId;
    return availableSubjects[0]?.id ?? '';
  }, [availableSubjects, subjectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!facultyId || !classId || !resolvedSubjectId) {
      setError('All fields are required');
      return;
    }
    setSubmitting(true);
    const result = await createAssignment({
      facultyId,
      subjectId: resolvedSubjectId,
      classId,
    });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Assign a faculty to a subject and class
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Faculty</InputLabel>
            <Select
              label="Faculty"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
            >
              {faculty.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name} ({f.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Class</InputLabel>
            <Select
              label="Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} · Semester {c.semester}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Subject</InputLabel>
            <Select
              label="Subject"
              value={resolvedSubjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {availableSubjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.code} · {s.name}
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
              {submitting ? 'Assigning…' : 'Add assignment'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}