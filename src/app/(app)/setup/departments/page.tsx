import { redirect } from 'next/navigation';
import { Box, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import DepartmentForm from './department-form';
import DeleteDepartmentButton from './delete-button';

export default async function DepartmentsPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'ADMIN') redirect('/setup');

  const [departments, hodCandidates] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        hod: { select: { name: true } },
        _count: { select: { members: true, classes: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'HOD', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, departmentId: true },
    }),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Departments
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        All departments across the college
      </Typography>

      <Box sx={{ mb: 4 }}>
        <DepartmentForm hodCandidates={hodCandidates} />
      </Box>

      {departments.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No departments yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>HOD</TableCell>
                <TableCell align="center">Members</TableCell>
                <TableCell align="center">Classes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{d.code}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>
                    {d.hod ? (
                      d.hod.name
                    ) : (
                      <Chip label="Unassigned" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">{d._count.members}</TableCell>
                  <TableCell align="center">{d._count.classes}</TableCell>
                  <TableCell align="right">
                    <DeleteDepartmentButton
                      departmentId={d.id}
                      departmentCode={d.code}
                      members={d._count.members}
                      classes={d._count.classes}
                    />
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