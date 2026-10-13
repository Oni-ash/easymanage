import { notFound, redirect } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import EditUserForm from './edit-form';

type Params = Promise<{ userId: string }>;

export default async function UserDetailPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');
  if (principal.role !== 'ADMIN' && principal.role !== 'FACULTY') {
    redirect('/users');
  }

  const { userId } = await params;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!target) notFound();

  const isAdmin = principal.role === 'ADMIN';

  // Faculty: only their own students
  if (!isAdmin) {
    if (target.role !== 'STUDENT') notFound();
    if (!target.classId) notFound();
    const access = await prisma.class.findFirst({
      where: {
        id: target.classId,
        OR: [
          { inchargeId: principal.id },
          { teaching: { some: { facultyId: principal.id } } },
        ],
      },
    });
    if (!access) notFound();
  }

  const [departments, classes] = await Promise.all([
    isAdmin
      ? prisma.department.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true, code: true },
        })
      : prisma.department.findMany({
          where: { id: target.departmentId ?? '__none__' },
          select: { id: true, name: true, code: true },
        }),
    isAdmin
      ? prisma.class.findMany({
          orderBy: [{ departmentId: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, departmentId: true },
        })
      : prisma.class.findMany({
          where: {
            id: target.classId ?? '__none__',
          },
          select: { id: true, name: true, departmentId: true },
        }),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Edit {target.name}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {target.username} · {target.email}
      </Typography>
      <EditUserForm
        isAdmin={isAdmin}
        target={{
          id: target.id,
          name: target.name,
          email: target.email,
          role: target.role,
          active: target.active,
          departmentId: target.departmentId,
          classId: target.classId,
          permissions: target.permissions as string[],
        }}
        departments={departments}
        classes={classes}
      />
    </Box>
  );
}