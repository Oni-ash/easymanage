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
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { assignGrievance, updateGrievance } from './actions';

type Staff = { id: string; name: string };

export default function StaffPanel({
  grievanceId,
  currentStatus,
  currentResponse,
  currentAssignedTo,
  assignableStaff,
  canAssign,
}: {
  grievanceId: string;
  currentStatus: string;
  currentResponse: string | null;
  currentAssignedTo: string | null;
  assignableStaff: Staff[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [response, setResponse] = useState(currentResponse ?? '');
  const [assignedTo, setAssignedTo] = useState(currentAssignedTo ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    setOkMessage(null);

    const result = await updateGrievance({
      grievanceId,
      status,
      response: response.trim() || null,
    });

    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (canAssign && assignedTo !== (currentAssignedTo ?? '')) {
      const assignResult = await assignGrievance({
        grievanceId,
        assignedToId: assignedTo || null,
      });
      if ('error' in assignResult) {
        setError(assignResult.error);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setOkMessage('Saved.');
    router.refresh();
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="IN_PROGRESS">In progress</MenuItem>
            <MenuItem value="RESOLVED">Resolved</MenuItem>
          </Select>
        </FormControl>

        {canAssign && (
          <FormControl fullWidth>
            <InputLabel>Assign to</InputLabel>
            <Select
              label="Assign to"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <MenuItem value="">
                <em>Unassigned</em>
              </MenuItem>
              {assignableStaff.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      <TextField
        label="Response (visible to the student)"
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        multiline
        minRows={3}
        fullWidth
        placeholder="Add notes, actions taken, or a resolution message for the student."
      />

      {error && <Alert severity="error">{error}</Alert>}
      {okMessage && <Alert severity="success">{okMessage}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={submitting}
          sx={{ borderRadius: 999, px: 4 }}
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </Box>
    </Stack>
  );
}