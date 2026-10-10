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
import { uploadMaterial } from './actions';

type ClassOption = { id: string; name: string };

export default function UploadForm({
  subjectId,
  classes,
}: {
  subjectId: string;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('NOTES');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError('Please select a file');
      return;
    }
    setSubmitting(true);

    const fd = new FormData();
    fd.set('subjectId', subjectId);
    fd.set('classId', classId);
    fd.set('title', title);
    fd.set('description', description);
    fd.set('type', type);
    fd.set('file', file);

    const result = await uploadMaterial(fd);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setTitle('');
    setDescription('');
    setType('NOTES');
    setFile(null);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {classes.length > 1 && (
            <FormControl fullWidth>
              <InputLabel>Class</InputLabel>
              <Select
                label="Class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
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
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              <MenuItem value="NOTES">Notes</MenuItem>
              <MenuItem value="ASSIGNMENT">Assignment</MenuItem>
              <MenuItem value="QUESTION_PAPER">Question paper</MenuItem>
              <MenuItem value="LAB_MANUAL">Lab manual</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" component="label" sx={{ borderRadius: 999 }}>
            {file ? file.name : 'Choose file'}
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Uploading…' : 'Upload'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}