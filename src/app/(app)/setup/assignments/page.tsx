import { redirect } from 'next/navigation';
import { Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import AssignmentForm from './assignment-form';
import DeleteAssignmentButton from './delete-button';

export default async function AssignmentsPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') redirect('/dashboard');

  const deptWhere =
    principal.role === 'ADMIN'
      ? {}
      : { departmentId: principal.departmentId ?? '__none__' };

  const [assignments, faculty, subjects, classes] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: { class: deptWhere },
      orderBy: [{ class: { name: 'asc' } }, { subject: { code: 'asc' } }],
      include: {
        faculty: { select: { name: true, username: true } },
        subject: { select: { code: true, name: true } },
        class: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { ...deptWhere, role: 'FACULTY', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true },
    }),
    prisma.subject.findMany({
      where: { ...deptWhere, active: true },
      orderBy: [{ semester: 'asc' }, { code: 'asc' }],
      select: { id: true, code: true, name: true, semester: true },
    }),
    prisma.class.findMany({
      where: deptWhere,
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, semester: true },
    }),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Teaching assignments
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Assign faculty to teach a subject to a class
      </Typography>

      <Stack spacing={2} sx={{ mb: 4 }}>
        <AssignmentForm faculty={faculty} subjects={subjects} classes={classes} />
      </Stack>

      {assignments.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No assignments yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Faculty</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Class</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.faculty.name}</TableCell>
                  <TableCell>
                    {a.subject.code} · {a.subject.name}
                  </TableCell>
                  <TableCell>{a.class.name}</TableCell>
                  <TableCell align="right">
                    <DeleteAssignmentButton assignmentId={a.id} />
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