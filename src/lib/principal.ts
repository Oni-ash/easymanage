import { cache } from 'react';
import type { Role, Permission } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type Principal = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  departmentId: string | null;
  department: { id: string; name: string; code: string } | null;
  classId: string | null;
  class: { id: string; name: string; semester: number } | null;
  inchargeOf: { id: string; name: string }[];
};

export const getPrincipal = cache(async (): Promise<Principal | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id, active: true },
    include: {
      department: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true, semester: true } },
      inchargeOf: { select: { id: true, name: true } },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    departmentId: user.departmentId,
    department: user.department,
    classId: user.classId,
    class: user.class,
    inchargeOf: user.inchargeOf,
  };
});