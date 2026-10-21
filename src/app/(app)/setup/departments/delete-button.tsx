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
import { deleteDepartment } from './actions';

export default function DeleteDepartmentButton({
  departmentId,
  departmentCode,
  members,
  classes,
}: {
  departmentId: string;
  departmentCode: string;
  members: number;
  classes: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    const result = await deleteDepartment(departmentId);
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
        Delete
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Delete {departmentCode}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {members > 0 || classes > 0
              ? `This department has ${members} member${members === 1 ? '' : 's'} and ${classes} class${classes === 1 ? '' : 'es'}. Move them out before deleting.`
              : 'This department is empty. It will be permanently removed.'}
          </DialogContentText>
          {error && <Alert severity="error">{error}</Alert>}
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
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}