'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import { createUser } from '../actions';

type Department = { id: string; name: string; code: string };
type ClassOption = { id: string; name: string; departmentId: string };

const ALL_PERMISSIONS = ['GRIEVANCE', 'FEE', 'CALENDAR_EDIT', 'RESULTS_PUBLISH'] as const;
type Perm = (typeof ALL_PERMISSIONS)[number];

export default function CreateUserForm({
  isAdmin,
  departments,
  classes,
}: {
  isAdmin: boolean;
  departments: Department[];
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(isAdmin ? 'STUDENT' : 'STUDENT');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [permissions, setPermissions] = useState<Perm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableClasses = useMemo(() => {
    if (!departmentId) return classes;
    return classes.filter((c) => c.departmentId === departmentId);
  }, [classes, departmentId]);

  // When department changes, re-pick first available class
  useMemo(() => {
    if (
      role === 'STUDENT' &&
      availableClasses.length > 0 &&
      !availableClasses.some((c) => c.id === classId)
    ) {
      setClassId(availableClasses[0].id);
    }
  }, [availableClasses, classId, role]);

  function togglePermission(p: Perm) {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.set('name', name);
    fd.set('username', username);
    fd.set('email', email);
    fd.set('password', password);
    fd.set('role', role);
    if (role === 'STUDENT' || role === 'FACULTY' || role === 'HOD') {
      fd.set('departmentId', departmentId);
    }
    if (role === 'STUDENT') fd.set('classId', classId);
    if (role === 'FACULTY') {
      permissions.forEach((p) => fd.append('permissions', p));
    }

    const result = await createUser(fd);
    if ('error' in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    router.push('/users');
    router.refresh();
  }

  const roleOptions = isAdmin
    ? ['STUDENT', 'FACULTY', 'HOD', 'ACCOUNTS', 'ADMIN']
    : ['STUDENT'];

  const showDepartment = ['STUDENT', 'FACULTY', 'HOD'].includes(role);
  const showClass = role === 'STUDENT';
  const showPermissions = role === 'FACULTY';

  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            fullWidth
            helperText="3-30 characters, lowercase letters, numbers, dots, underscores, or dashes"
          />

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Initial password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText="At least 8 characters. Share it with the user out-of-band."
          />

          <FormControl fullWidth disabled={!isAdmin}>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roleOptions.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showDepartment && (
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!isAdmin && departments.length <= 1}
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
            <FormControl fullWidth>
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
                      />
                    }
                    label={p.replace('_', ' ')}
                  />
                ))}
              </FormGroup>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => router.push('/users')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ borderRadius: 999, px: 4 }}
            >
              {submitting ? 'Creating…' : 'Create user'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}