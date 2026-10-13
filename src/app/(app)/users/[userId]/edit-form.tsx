'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { updateUser, resetPassword } from '../actions';

type Department = { id: string; name: string; code: string };
type ClassOption = { id: string; name: string; departmentId: string };

const ALL_PERMISSIONS = ['GRIEVANCE', 'FEE', 'CALENDAR_EDIT', 'RESULTS_PUBLISH'] as const;
type Perm = (typeof ALL_PERMISSIONS)[number];

export default function EditUserForm({
  isAdmin,
  target,
  departments,
  classes,
}: {
  isAdmin: boolean;
  target: {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    departmentId: string | null;
    classId: string | null;
    permissions: string[];
  };
  departments: Department[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(target.name);
  const [email, setEmail] = useState(target.email);
  const [role, setRole] = useState(target.role);
  const [departmentId, setDepartmentId] = useState(target.departmentId ?? '');
  const [classId, setClassId] = useState(target.classId ?? '');
  const [permissions, setPermissions] = useState<Perm[]>(
    (target.permissions as Perm[]) ?? [],
  );
  const [active, setActive] = useState(target.active);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const availableClasses = useMemo(() => {
    if (!departmentId) return classes;
    return classes.filter((c) => c.departmentId === departmentId);
  }, [classes, departmentId]);

  function togglePermission(p: Perm) {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMessage(null);
    setSubmitting(true);

    const result = await updateUser({
      userId: target.id,
      name,
      email,
      role,
      departmentId: role === 'STUDENT' || role === 'FACULTY' || role === 'HOD' ? departmentId : null,
      classId: role === 'STUDENT' ? classId : null,
      permissions: role === 'FACULTY' ? permissions : [],
      active,
    });

    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setOkMessage('Saved.');
    router.refresh();
  }

  async function handlePasswordReset() {
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwSubmitting(true);
    const result = await resetPassword({ userId: target.id, newPassword });
    setPwSubmitting(false);
    if ('error' in result) {
      setPwError(result.error);
      return;
    }
    setPwOpen(false);
    setNewPassword('');
    setOkMessage('Password reset.');
  }

  const roleOptions = isAdmin
    ? ['STUDENT', 'FACULTY', 'HOD', 'ACCOUNTS', 'ADMIN']
    : ['STUDENT'];
  const showDepartment = ['STUDENT', 'FACULTY', 'HOD'].includes(role);
  const showClass = role === 'STUDENT';
  const showPermissions = role === 'FACULTY';

  return (
    <>
      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Box component="form" onSubmit={handleSave}>
          <Stack spacing={2}>
            <TextField
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />

            <FormControl fullWidth disabled={!isAdmin}>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
                {roleOptions.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {showDepartment && (
              <FormControl fullWidth disabled={!isAdmin}>
                <InputLabel>Department</InputLabel>
                <Select
                  label="Department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {showClass && (
              <FormControl fullWidth disabled={!isAdmin}>
                <InputLabel>Class</InputLabel>
                <Select
                  label="Class"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  {availableClasses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {showPermissions && (
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Permissions
                </Typography>
                <FormGroup>
                  {ALL_PERMISSIONS.map((p) => (
                    <FormControlLabel
                      key={p}
                      control={
                        <Checkbox
                          checked={permissions.includes(p)}
                          onChange={() => togglePermission(p)}
                          disabled={!isAdmin}
                        />
                      }
                      label={p.replace('_', ' ')}
                    />
                  ))}
                </FormGroup>
              </Box>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={!active}
                  onChange={(e) => setActive(!e.target.checked)}
                  disabled={!isAdmin}
                />
              }
              label="Deactivate this account"
            />

            {error && <Alert severity="error">{error}</Alert>}
            {okMessage && <Alert severity="success">{okMessage}</Alert>}

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Button
                onClick={() => setPwOpen(true)}
                variant="outlined"
                sx={{ borderRadius: 999, px: 3 }}
              >
                Reset password
              </Button>
              <Stack direction="row" spacing={2}>
                <Button onClick={() => router.push('/users')} disabled={submitting}>
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  sx={{ borderRadius: 999, px: 4 }}
                >
                  {submitting ? 'Saving…' : 'Save changes'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Dialog open={pwOpen} onClose={() => setPwOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reset password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Set a new password for {target.name}. Share it with them out-of-band.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="At least 8 characters"
          />
          {pwError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {pwError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPwOpen(false)} disabled={pwSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordReset}
            disabled={pwSubmitting}
            sx={{ borderRadius: 999, px: 3 }}
          >
            {pwSubmitting ? 'Saving…' : 'Set password'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}