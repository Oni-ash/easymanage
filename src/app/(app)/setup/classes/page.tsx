import { redirect } from 'next/navigation';
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import ClassForm from './class-form';
import DeleteClassButton from './delete-button';

export default async function ClassesPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'HOD' && principal.role !== 'ADMIN') redirect('/dashboard');

  const isAdmin = principal.role === 'ADMIN';
  const deptWhere = isAdmin ? {} : { departmentId: principal.departmentId ?? '__none__' };

  const [classes, faculty, departments] = await Promise.all([
    prisma.class.findMany({
      where: deptWhere,
      orderBy: [{ semester: 'asc' }, { name: 'asc' }],
      include: {
        department: { select: { code: true } },
        incharge: { select: { name: true } },
        _count: { select: { students: true } },
      },
    }),
    prisma.user.findMany({
      where: { ...deptWhere, role: 'FACULTY', active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, departmentId: true },
    }),
    isAdmin
      ? prisma.department.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Classes
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {isAdmin ? 'All classes across the college' : `${principal.department?.name ?? 'Your department'}`}
      </Typography>

      <Box sx={{ mb: 4 }}>
        <ClassForm
          isAdmin={isAdmin}
          departments={departments}
          faculty={faculty}
          defaultDepartmentId={principal.departmentId ?? ''}
        />
      </Box>

      {classes.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No classes yet.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Class</TableCell>
                <TableCell>Semester</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Incharge</TableCell>
                <TableCell align="center">Students</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell>{c.semester}</TableCell>
                  <TableCell>{c.department.code}</TableCell>
                  <TableCell>
                    {c.incharge ? (
                      c.incharge.name
                    ) : (
                      <Chip label="None" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="center">{c._count.students}</TableCell>
                  <TableCell align="right">
                    <DeleteClassButton
                      classId={c.id}
                      className={c.name}
                      studentCount={c._count.students}
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