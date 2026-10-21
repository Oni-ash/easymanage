import { redirect } from 'next/navigation';
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import SubjectForm from './subject-form';

export default async function SubjectsPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') redirect('/dashboard');

  const where =
    principal.role === 'ADMIN'
      ? {}
      : { departmentId: principal.departmentId ?? '__none__' };

  const subjects = await prisma.subject.findMany({
    where,
    orderBy: [{ semester: 'asc' }, { code: 'asc' }],
    include: { department: { select: { code: true } } },
  });

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Subjects
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.role === 'ADMIN'
          ? 'All subjects across departments'
          : `${principal.department?.name ?? 'Your department'} · manage per-semester subjects`}
      </Typography>

      <Stack spacing={2} sx={{ mb: 4 }}>
        <SubjectForm
          isAdmin={principal.role === 'ADMIN'}
          departments={
            principal.role === 'ADMIN'
              ? await prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } })
              : []
          }
        />
      </Stack>

      {subjects.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No subjects defined yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Semester</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Practical</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.semester}</TableCell>
                  <TableCell>{s.department.code}</TableCell>
                  <TableCell>{s.hasPractical ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {s.active ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Retired" variant="outlined" size="small" />
                    )}
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