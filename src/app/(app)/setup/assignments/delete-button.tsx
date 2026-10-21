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
import { deleteAssignment } from './actions';

export default function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    const result = await deleteAssignment(assignmentId);
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
      <Button size="small" color="error" onClick={() => setOpen(true)}>
        Remove
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Remove this assignment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the faculty-to-subject-to-class link. Any marks or attendance already
            recorded remain unaffected.
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
            color="error"
            variant="contained"
            onClick={confirm}
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