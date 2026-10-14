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
} from '@mui/material';
import { publishExam } from './actions';

export default function PublishButton({
  examId,
  disabled,
}: {
  examId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    const result = await publishExam(examId);
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="contained"
        color="success"
        disabled={disabled}
        onClick={() => setOpen(true)}
        sx={{ borderRadius: 999, px: 4 }}
      >
        Publish results
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Publish these results?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Once published, marks become visible to students and cannot be edited without
            tracked revisions. This cannot be undone.
          </DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={confirm}
            disabled={submitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {submitting ? 'Publishing…' : 'Publish'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}