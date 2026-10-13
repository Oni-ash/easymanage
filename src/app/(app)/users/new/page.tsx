import { redirect } from 'next/navigation';
import { Box, Paper, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import CreateUserForm from './create-form';

export default async function NewUserPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'ADMIN' && principal.role !== 'FACULTY') {
    redirect('/users');
  }

  const isAdmin = principal.role === 'ADMIN';

  // Data options for the form
  const [departments, classes] = await Promise.all([
    isAdmin
      ? prisma.department.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true, code: true },
        })
      : prisma.department.findMany({
          where: { id: principal.departmentId ?? '__none__' },
          select: { id: true, name: true, code: true },
        }),
    isAdmin
      ? prisma.class.findMany({
          orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
          select: { id: true, name: true, departmentId: true },
        })
      : prisma.class.findMany({
          where: {
            OR: [
              { inchargeId: principal.id },
              { teaching: { some: { facultyId: principal.id } } },
            ],
          },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, departmentId: true },
        }),
  ]);
  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        New user
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {isAdmin
          ? 'Create an account for any role'
          : 'Create a student account for your classes'}
      </Typography>
      <CreateUserForm
        isAdmin={isAdmin}
        departments={departments}
        classes={classes}
      />
    </Box>
  );
}