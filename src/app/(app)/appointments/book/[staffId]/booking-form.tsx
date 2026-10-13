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
import { requestAppointment } from './actions';

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  location: string | null;
};

function formatSlot(slot: Slot) {
  const start = new Date(slot.startAt);
  const end = new Date(slot.endAt);
  const dateStr = start.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const startStr = start.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endStr = end.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} · ${startStr}–${endStr}${slot.location ? ` · ${slot.location}` : ''}`;
}

export default function BookingForm({
  staffId,
  staffName,
  slots,
}: {
  staffId: string;
  staffName: string;
  slots: Slot[];
}) {
  const router = useRouter();
  const [slotId, setSlotId] = useState(slots[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!slotId) {
      setError('Please pick a slot');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Please give a bit more detail in your reason');
      return;
    }
    setSubmitting(true);

    const result = await requestAppointment({ staffId, slotId, reason: reason.trim() });
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/appointments');
    router.refresh();
  }

  if (slots.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>
          {staffName} has no available slots right now. Try again later.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Pick a slot</InputLabel>
            <Select
              label="Pick a slot"
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
            >
              {slots.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {formatSlot(s)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Reason for the appointment"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={4}
            required
            fullWidth
            placeholder="Briefly explain what you would like to discuss."
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => router.push('/appointments')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Requesting…' : 'Request appointment'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}