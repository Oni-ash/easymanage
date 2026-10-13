import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function FacultyUsers({ principal }: { principal: Principal }) {
  // Which classes does this faculty have access to?
  const taught = await prisma.teachingAssignment.findMany({
    where: { facultyId: principal.id },
    select: { classId: true },
  });
  const classIds = Array.from(
    new Set([
      ...principal.inchargeOf.map((c) => c.id),
      ...taught.map((t) => t.classId),
    ]),
  );

  const students = classIds.length
    ? await prisma.user.findMany({
        where: { role: 'STUDENT', classId: { in: classIds } },
        orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
        include: { class: { select: { name: true } } },
      })
    : [];

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            Students
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage login accounts for students in your classes
          </Typography>
        </Box>
        <LinkButton
          href="/users/new"
          variant="contained"
          sx={{ borderRadius: 999, px: 3 }}
          disabled={classIds.length === 0}
        >
          New student
        </LinkButton>
      </Stack>

      {classIds.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to any class yet.
          </Typography>
        </Paper>
      ) : students.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No students in your classes yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.username}</TableCell>
                  <TableCell>{s.class?.name ?? '—'}</TableCell>
                  <TableCell>
                    {s.active ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Inactive" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(s.createdAt)}</TableCell>
                  <TableCell align="right">
                    <LinkButton
                      href={`/users/${s.id}`}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 999 }}
                    >
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