'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { createEvent, deleteEvent, updateEvent } from './actions';

type ClassOption = { id: string; name: string; semester: number };

type EventRow = {
  id: string;
  title: string;
  details: string | null;
  scope: string;
  semester: number | null;
  classId: string | null;
  startAt: string;
  endAt: string | null;
  departmentCode: string | null;
  className: string | null;
};

type Scope = 'DEPARTMENT' | 'SEMESTER' | 'CLASS';

export default function EventManager({
  events,
  classes,
}: {
  events: EventRow[];
  classes: ClassOption[];
}) {
  const router = useRouter();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [scope, setScope] = useState<Scope>('DEPARTMENT');
  const [semester, setSemester] = useState(5);
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function openNew() {
    setEditing(null);
    setTitle('');
    setDetails('');
    setScope('DEPARTMENT');
    setSemester(5);
    setClassId(classes[0]?.id ?? '');
    setStartDate('');
    setEndDate('');
    setError(null);
    setEditorOpen(true);
  }

  function openEdit(e: EventRow) {
    setEditing(e);
    setTitle(e.title);
    setDetails(e.details ?? '');
    setScope(e.scope as Scope);
    setSemester(e.semester ?? 5);
    setClassId(e.classId ?? classes[0]?.id ?? '');
    setStartDate(e.startAt.slice(0, 10));
    setEndDate(e.endAt?.slice(0, 10) ?? '');
    setError(null);
    setEditorOpen(true);
  }

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }
    setSubmitting(true);

    const payload = {
      title: title.trim(),
      details: details.trim() || null,
      scope,
      semester: scope === 'SEMESTER' ? semester : null,
      classId: scope === 'CLASS' ? classId : null,
      startAt: startDate,
      endAt: endDate || null,
    };

    const result = editing
      ? await updateEvent({ ...payload, id: editing.id })
      : await createEvent(payload);

    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setEditorOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    setSubmitting(true);
    setError(null);
    const result = await deleteEvent(confirmDeleteId);
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setConfirmDeleteId(null);
    router.refresh();
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Manage department events
        </Typography>
        <Button
          variant="contained"
          onClick={openNew}
          sx={{ borderRadius: 999, px: 3 }}
        >
          New event
        </Button>
      </Stack>

      {error && !editorOpen && !confirmDeleteId && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {events.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No department events yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.startAt.slice(0, 10)}</TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>
                    {e.scope === 'DEPARTMENT' && 'Department'}
                    {e.scope === 'SEMESTER' && `Semester ${e.semester}`}
                    {e.scope === 'CLASS' && (e.className ?? 'Class')}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openEdit(e)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setError(null);
                        setConfirmDeleteId(e.id);
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editing ? 'Edit event' : 'New event'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Details (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Scope</InputLabel>
              <Select
                label="Scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
              >
                <MenuItem value="DEPARTMENT">Entire department</MenuItem>
                <MenuItem value="SEMESTER">Specific semester</MenuItem>
                <MenuItem value="CLASS">Specific class</MenuItem>
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

            {scope === 'CLASS' && (
              <FormControl fullWidth>
                <InputLabel>Class</InputLabel>
                <Select
                  label="Class"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} (Sem {c.semester})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
                required
              />
                <TextField
                label="End date (optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditorOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={save}
            variant="contained"
            disabled={submitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>Delete this event?</DialogTitle>
        <DialogContent>
          <DialogContentText>This cannot be undone.</DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDeleteId(null)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={submitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}