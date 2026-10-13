'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { approveAppointment, rejectAppointment } from './actions';

export default function DecisionPanel({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function approve() {
    setSubmitting(true);
    setError(null);
    const result = await approveAppointment(requestId);
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function reject() {
    setReasonError(null);
    if (reason.trim().length < 5) {
      setReasonError('Please give a brief reason');
      return;
    }
    setSubmitting(true);
    const result = await rejectAppointment(requestId, reason.trim());
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setRejectOpen(false);
    setReason('');
    router.refresh();
  }

  return (
    <>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
        <Button
          color="error"
          variant="outlined"
          onClick={() => setRejectOpen(true)}
          disabled={submitting}
          sx={{ borderRadius: 999, px: 3 }}
        >
          Reject
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={approve}
          disabled={submitting}
          sx={{ borderRadius: 999, px: 3 }}
        >
          {submitting ? 'Please wait…' : 'Approve'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject this request</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why. The student will see this."
            sx={{ mt: 1 }}
          />
          {reasonError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {reasonError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={reject}
            disabled={submitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {submitting ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}