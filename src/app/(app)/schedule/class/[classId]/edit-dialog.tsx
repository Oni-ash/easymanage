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
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { deleteSlot, upsertSlot } from './actions';

type Slot = {
  id: string;
  dayOfWeek: number;
  period: number;
  subjectId: string;
  facultyId: string;
  room: string | null;
};

type Subject = { id: string; name: string; code: string };
type Faculty = { id: string; name: string };

const DAYS = [
  { num: 1, name: 'Monday' },
  { num: 2, name: 'Tuesday' },
  { num: 3, name: 'Wednesday' },
  { num: 4, name: 'Thursday' },
  { num: 5, name: 'Friday' },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function EditDialog({
  classId,
  slots,
  subjects,
  faculty,
}: {
  classId: string;
  slots: Slot[];
  subjects: Subject[];
  faculty: Faculty[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [period, setPeriod] = useState(1);
  const [subjectId, setSubjectId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [room, setRoom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  function openSlot(day: number, per: number) {
    const slot = slots.find((s) => s.dayOfWeek === day && s.period === per);
    setDayOfWeek(day);
    setPeriod(per);
    if (slot) {
      setExistingId(slot.id);
      setSubjectId(slot.subjectId);
      setFacultyId(slot.facultyId);
      setRoom(slot.room ?? '');
    } else {
      setExistingId(null);
      setSubjectId(subjects[0]?.id ?? '');
      setFacultyId(faculty[0]?.id ?? '');
      setRoom('');
    }
    setError(null);
    setOpen(true);
  }

  async function save() {
    setSubmitting(true);
    setError(null);
    const result = await upsertSlot({
      classId,
      dayOfWeek,
      period,
      subjectId,
      facultyId,
      room: room.trim() || null,
    });
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setOpen(false);
    setSubmitting(false);
    router.refresh();
  }

  async function remove() {
    if (!existingId) return;
    setSubmitting(true);
    setError(null);
    const result = await deleteSlot(existingId);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setOpen(false);
    setSubmitting(false);
    router.refresh();
  }

  const byKey = new Map(slots.map((s) => [`${s.dayOfWeek}-${s.period}`, s]));

  return (
    <>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `110px repeat(${PERIODS.length}, 1fr)`,
            gap: 1,
            minWidth: 800,
          }}
        >
          <Box />
          {PERIODS.map((p) => (
            <Box
              key={p}
              sx={{ textAlign: 'center', fontWeight: 700, fontSize: 13, py: 1 }}
            >
              P{p}
            </Box>
          ))}

          {DAYS.map((d) => (
            <Box key={d.num} sx={{ display: 'contents' }}>
              <Box sx={{ fontWeight: 600, py: 1, fontSize: 13 }}>{d.name}</Box>
              {PERIODS.map((p) => {
                const slot = byKey.get(`${d.num}-${p}`);
                const subject = slot ? subjects.find((s) => s.id === slot.subjectId) : null;
                const fac = slot ? faculty.find((f) => f.id === slot.facultyId) : null;
                return (
                  <Button
                    key={p}
                    onClick={() => openSlot(d.num, p)}
                    variant={slot ? 'contained' : 'outlined'}
                    color={slot ? 'primary' : 'inherit'}
                    size="small"
                    sx={{
                      minHeight: 60,
                      flexDirection: 'column',
                      textTransform: 'none',
                      fontSize: 11,
                      px: 0.5,
                    }}
                  >
                    {slot ? (
                      <>
                        <Box sx={{ fontWeight: 700 }}>{subject?.code ?? '—'}</Box>
                        <Box sx={{ fontSize: 10, opacity: 0.85 }}>{fac?.name ?? ''}</Box>
                        {slot.room && <Box sx={{ fontSize: 10, opacity: 0.7 }}>{slot.room}</Box>}
                      </>
                    ) : (
                      <Box sx={{ fontSize: 18, opacity: 0.3 }}>+</Box>
                    )}
                  </Button>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>
          {DAYS.find((d) => d.num === dayOfWeek)?.name} · Period {period}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                label="Subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Faculty</InputLabel>
              <Select
                label="Faculty"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
              >
                {faculty.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Room (optional)"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {existingId && (
            <Button color="error" onClick={remove} disabled={submitting} sx={{ mr: 'auto' }}>
              Delete
            </Button>
          )}
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={submitting} sx={{ borderRadius: 999, px: 3 }}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}