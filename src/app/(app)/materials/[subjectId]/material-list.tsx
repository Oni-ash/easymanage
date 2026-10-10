'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { formatDate } from '@/lib/dates';
import { deleteMaterial } from './actions';

type Material = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy: { id: string; name: string };
  className: string;
  canDelete: boolean;
};

export default function MaterialList({ materials }: { materials: Material[] }) {
  if (materials.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography sx={{ color: 'text.secondary' }}>
          No materials uploaded for this subject yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      {materials.map((m) => (
        <MaterialCard key={m.id} material={m} />
      ))}
    </Stack>
  );
}

function MaterialCard({ material }: { material: Material }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteMaterial(material.id);
    if ('error' in result) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{material.title}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {material.fileName} · {formatBytes(material.sizeBytes)}
              </Typography>
            </Box>
            <Chip label={typeLabel(material.type)} size="small" variant="outlined" />
          </Stack>

          {material.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {material.description}
            </Typography>
          )}

          <Divider />

          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {material.className} · {material.uploadedBy.name} · {formatDate(material.createdAt)}
            </Typography>
            <Stack direction="row" spacing={1}>
              {material.canDelete && (
                <Button
                  size="small"
                  color="error"
                  onClick={() => setConfirmOpen(true)}
                  sx={{ borderRadius: 999 }}
                >
                  Delete
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                href={`/api/material/${material.id}/download`}
                sx={{ borderRadius: 999, px: 3 }}
              >
                Download
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete this material?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The file will be permanently removed. This cannot be undone.
          </DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function typeLabel(t: string) {
  if (t === 'NOTES') return 'Notes';
  if (t === 'ASSIGNMENT') return 'Assignment';
  if (t === 'QUESTION_PAPER') return 'Question paper';
  if (t === 'LAB_MANUAL') return 'Lab manual';
  return 'Other';
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}