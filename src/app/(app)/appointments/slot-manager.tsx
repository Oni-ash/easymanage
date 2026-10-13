'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { createSlot, deleteSlot } from './actions';

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  location: string | null;
  isBooked: boolean;
  bookedByName: string | null;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function SlotManager({ slots }: { slots: Slot[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function openNew() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now);
    end.setMinutes(end.getMinutes() + 30);

    setStartAt(toLocalInput(now.toISOString()));
    setEndAt(toLocalInput(end.toISOString()));
    setLocation('');
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    if (!startAt || !endAt) {
      setError('Start and end are required');
      return;
    }
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (endDate <= startDate) {
      setError('End must be after start');
      return;
    }
    if (startDate < new Date()) {
      setError('Slot must be in the future');
      return;
    }
    setSubmitting(true);
    const result = await createSlot({
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      location: location.trim() || null,
    });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    setSubmitting(true);
    setError(null);
    const result = await deleteSlot(confirmDeleteId);
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
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {slots.length === 0
            ? 'You have no upcoming slots.'
            : `${slots.length} upcoming slot${slots.length === 1 ? '' : 's'}`}
        </Typography>
        <Button variant="outlined" onClick={openNew} sx={{ borderRadius: 999, px: 3 }}>
          Add slot
        </Button>
      </Stack>

      {error && !open && !confirmDeleteId && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {slots.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {new Date(s.startAt).toLocaleString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>{s.location ?? '—'}</TableCell>
                  <TableCell>
                    {s.isBooked ? (
                      <Typography variant="caption" color="warning.main">
                        Booked{s.bookedByName ? ` · ${s.bookedByName}` : ''}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="success.main">
                        Free
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setError(null);
                        setConfirmDeleteId(s.id);
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New slot</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="End"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Cabin B-201, or a meeting link"
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={save}
            variant="contained"
            disabled={submitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {submitting ? 'Saving…' : 'Create slot'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>Remove this slot?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            If the slot is booked, the student will not be notified. Consider contacting them.
          </DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={submitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {submitting ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}