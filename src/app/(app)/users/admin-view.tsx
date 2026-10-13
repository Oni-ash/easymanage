import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function AdminUsers({ principal }: { principal: Principal }) {
  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: {
      department: { select: { code: true } },
      class: { select: { name: true } },
    },
  });

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            Users
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage every account in the system
          </Typography>
        </Box>
        <LinkButton
          href="/users/new"
          variant="contained"
          sx={{ borderRadius: 999, px: 3 }}
        >
          New user
        </LinkButton>
      </Stack>

      {users.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>No users yet.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Department / Class</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <RoleChip role={u.role} />
                  </TableCell>
                  <TableCell>
                    {u.department?.code ?? '—'}
                    {u.class ? ` · ${u.class.name}` : ''}
                  </TableCell>
                  <TableCell>
                    {u.active ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Inactive" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                  <TableCell align="right">
                    <LinkButton href={`/users/${u.id}`} size="small" variant="outlined" sx={{ borderRadius: 999 }}>
                      Edit
                    </LinkButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

function RoleChip({ role }: { role: string }) {
  const colorMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'default'> = {
    STUDENT: 'default',
    FACULTY: 'primary',
    HOD: 'secondary',
    ACCOUNTS: 'info',
    ADMIN: 'warning',
  };
  return <Chip label={role} color={colorMap[role] ?? 'default'} size="small" />;
}