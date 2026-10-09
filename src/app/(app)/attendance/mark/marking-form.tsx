'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { saveAttendance } from './actions';

type Student = { id: string; name: string; username: string };
type Status = 'PRESENT' | 'LATE' | 'ABSENT';

export default function MarkingForm({
  classId,
  subjectId,
  period,
  date,
  students,
  initial,
}: {
  classId: string;
  subjectId: string;
  period: number;
  date: string;
  students: Student[];
  initial: Record<string, Status>;
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(students.map((s) => [s.id, initial[s.id] ?? 'PRESENT'])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set('classId', classId);
    fd.set('subjectId', subjectId);
    fd.set('period', String(period));
    fd.set('date', date);
    for (const [studentId, status] of Object.entries(statuses)) {
      fd.set(`status-${studentId}`, status);
    }

    const result = await saveAttendance(fd);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/attendance');
    router.refresh();
  }

  const summary = students.reduce(
    (acc, s) => {
      acc[statuses[s.id]] = (acc[statuses[s.id]] ?? 0) + 1;
      return acc;
    },
    {} as Record<Status, number>,
  );

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
          <SummaryChip label="Present" value={summary.PRESENT ?? 0} color="success.main" />
          <SummaryChip label="Late" value={summary.LATE ?? 0} color="warning.main" />
          <SummaryChip label="Absent" value={summary.ABSENT ?? 0} color="error.main" />
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={() => setAll(setStatuses, students, 'PRESENT')} size="small">
            All present
          </Button>
        </Stack>
      </Paper>

      {students.map((s) => (
        <Paper key={s.id} sx={{ p: 2, borderRadius: 3 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {s.username}
              </Typography>
            </Box>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={statuses[s.id]}
              onChange={(_, value: Status | null) => {
                if (value) setStatuses((prev) => ({ ...prev, [s.id]: value }));
              }}
            >
              <ToggleButton value="PRESENT" sx={{ px: 2 }}>Present</ToggleButton>
              <ToggleButton value="LATE" sx={{ px: 2 }}>Late</ToggleButton>
              <ToggleButton value="ABSENT" sx={{ px: 2 }}>Absent</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Paper>
      ))}

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', pt: 1 }}>
        <Button onClick={() => router.push('/attendance')} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={submitting}
          sx={{ borderRadius: 999, px: 4 }}
        >
          {submitting ? 'Saving…' : 'Save attendance'}
        </Button>
      </Stack>
    </Stack>
  );
}

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Stack spacing={0}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, color }}>{value}</Typography>
    </Stack>
  );
}

function setAll(
  setter: React.Dispatch<React.SetStateAction<Record<string, Status>>>,
  students: Student[],
  status: Status,
) {
  setter(Object.fromEntries(students.map((s) => [s.id, status])));
}