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
import { approveAsIncharge, approveAsHod, rejectAsIncharge, rejectAsHod } from './actions';

type Mode = 'incharge' | 'hod';

export default function DecisionForm({ requestId, mode }: { requestId: string; mode: Mode }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    const fn = mode === 'incharge' ? approveAsIncharge : approveAsHod;
    const result = await fn(requestId);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/leave');
    router.refresh();
  }

  async function handleReject() {
    setReasonError(null);
    if (reason.trim().length < 5) {
      setReasonError('Please write a short reason for the student');
      return;
    }

    setSubmitting(true);
    const fn = mode === 'incharge' ? rejectAsIncharge : rejectAsHod;
    const result = await fn(requestId, reason.trim());
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/leave');
    router.refresh();
  }

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          variant="contained"
          color="success"
          size="large"
          onClick={handleApprove}
          disabled={submitting}
          sx={{ borderRadius: 999, px: 4 }}
        >
          {submitting ? 'Please wait…' : mode === 'incharge' ? 'Approve & forward to HOD' : 'Approve'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="large"
          onClick={() => setDialogOpen(true)}
          disabled={submitting}
          sx={{ borderRadius: 999, px: 4 }}
        >
          Reject
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
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
            placeholder="Explain why this request is being rejected. The student will see this."
            sx={{ mt: 1 }}
          />
          {reasonError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {reasonError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={submitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {submitting ? 'Rejecting…' : 'Reject request'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}