'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const ALL_ROLES = ['STUDENT', 'FACULTY', 'HOD', 'ACCOUNTS', 'ADMIN'];
const ALL_PERMISSIONS = ['GRIEVANCE', 'FEE', 'CALENDAR_EDIT', 'RESULTS_PUBLISH'];

async function assertCanManageStudent(
  principalId: string,
  studentClassId: string | null,
): Promise<boolean> {
  if (!studentClassId) return false;
  const access = await prisma.class.findFirst({
    where: {
      id: studentClassId,
      OR: [
        { inchargeId: principalId },
        { teaching: { some: { facultyId: principalId } } },
      ],
    },
    select: { id: true },
  });
  return !!access;
}

// ───────────────────────── create ───────────────────────────

export async function createUser(formData: FormData): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const isAdmin = principal.role === 'ADMIN';
  const isFaculty = principal.role === 'FACULTY';
  if (!isAdmin && !isFaculty) return { error: 'Not authorized' };

  const name = String(formData.get('name') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const role = String(formData.get('role') ?? '');
  const departmentId = String(formData.get('departmentId') ?? '') || null;
  const classId = String(formData.get('classId') ?? '') || null;
  const permissions = formData.getAll('permissions').map(String) as string[];

  // Validate
  if (!name || name.length < 2) return { error: 'Name is too short' };
  if (!USERNAME_RE.test(username)) {
    return { error: 'Username must be 3-30 chars: lowercase letters, numbers, dots, underscores, dashes' };
  }
  if (!email.includes('@') || email.length < 5) return { error: 'Invalid email' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };
  if (!ALL_ROLES.includes(role)) return { error: 'Invalid role' };

  // Role-based restrictions
  if (isFaculty) {
    if (role !== 'STUDENT') return { error: 'Faculty can only create student accounts' };
    if (!classId) return { error: 'Class is required' };
    const allowed = await assertCanManageStudent(principal.id, classId);
    if (!allowed) return { error: 'You do not teach this class' };
    if (!departmentId) return { error: 'Department is required' };
  }

  if ((role === 'FACULTY' || role === 'HOD') && !departmentId) {
    return { error: 'Department is required for this role' };
  }
  if (role === 'STUDENT' && (!departmentId || !classId)) {
    return { error: 'Department and class are required for students' };
  }

  // Validate permissions
  const finalPermissions =
    role === 'FACULTY' ? permissions.filter((p) => ALL_PERMISSIONS.includes(p)) : [];

  // Check uniqueness
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { username: true, email: true },
  });
  if (existing) {
    if (existing.username === username) return { error: 'Username is already taken' };
    return { error: 'Email is already in use' };
  }

  // Validate FK references
  if (departmentId) {
    const d = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
    if (!d) return { error: 'Department not found' };
  }
  if (classId) {
    const c = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } });
    if (!c) return { error: 'Class not found' };
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        username,
        email,
        passwordHash: bcrypt.hashSync(password, 10),
        role: role as 'STUDENT' | 'FACULTY' | 'HOD' | 'ACCOUNTS' | 'ADMIN',
        departmentId,
        classId,
        permissions: finalPermissions as ('GRIEVANCE' | 'FEE' | 'CALENDAR_EDIT' | 'RESULTS_PUBLISH')[],
        createdById: principal.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: created.id,
        meta: { username, role },
      },
    });
  });

  revalidatePath('/users');
  return { ok: true };
}

// ───────────────────────── update ───────────────────────────

export async function updateUser(input: {
  userId: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  classId: string | null;
  permissions: string[];
  active: boolean;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const isAdmin = principal.role === 'ADMIN';
  const isFaculty = principal.role === 'FACULTY';
  if (!isAdmin && !isFaculty) return { error: 'Not authorized' };

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, classId: true, departmentId: true },
  });
  if (!target) return { error: 'User not found' };

  if (isFaculty) {
    if (target.role !== 'STUDENT') return { error: 'You can only edit students' };
    const allowed = await assertCanManageStudent(principal.id, target.classId);
    if (!allowed) return { error: 'This student is not in your classes' };
    // Faculty can only edit name/email/active — keep everything else
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        active: input.active,
      },
    });
    revalidatePath('/users');
    revalidatePath(`/users/${input.userId}`);
    return { ok: true };
  }

  // Admin path
  if (!input.name.trim() || input.name.trim().length < 2) {
    return { error: 'Name is too short' };
  }
  if (!input.email.includes('@')) return { error: 'Invalid email' };
  if (!ALL_ROLES.includes(input.role)) return { error: 'Invalid role' };

  if ((input.role === 'FACULTY' || input.role === 'HOD') && !input.departmentId) {
    return { error: 'Department is required for this role' };
  }
  if (input.role === 'STUDENT' && (!input.departmentId || !input.classId)) {
    return { error: 'Department and class are required for students' };
  }

  // Prevent admin from deactivating / demoting themselves (foot-gun)
  if (target.id === principal.id) {
    if (input.role !== 'ADMIN') return { error: 'You cannot change your own role' };
    if (!input.active) return { error: 'You cannot deactivate your own account' };
  }

  // Email uniqueness (excluding self)
  const clash = await prisma.user.findFirst({
    where: { email: input.email.trim().toLowerCase(), NOT: { id: input.userId } },
    select: { id: true },
  });
  if (clash) return { error: 'Email is already in use' };

  const finalPermissions =
    input.role === 'FACULTY'
      ? input.permissions.filter((p) => ALL_PERMISSIONS.includes(p))
      : [];

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role as 'STUDENT' | 'FACULTY' | 'HOD' | 'ACCOUNTS' | 'ADMIN',
        departmentId: input.departmentId,
        classId: input.role === 'STUDENT' ? input.classId : null,
        permissions: finalPermissions as ('GRIEVANCE' | 'FEE' | 'CALENDAR_EDIT' | 'RESULTS_PUBLISH')[],
        active: input.active,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: input.userId,
        meta: { role: input.role, active: input.active },
      },
    });
  });

  revalidatePath('/users');
  revalidatePath(`/users/${input.userId}`);
  return { ok: true };
}

// ───────────────────────── reset password ───────────────────

export async function resetPassword(input: {
  userId: string;
  newPassword: string;
}): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role !== 'ADMIN' && principal.role !== 'FACULTY') {
    return { error: 'Not authorized' };
  }
  if (input.newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, classId: true },
  });
  if (!target) return { error: 'User not found' };

  if (principal.role === 'FACULTY') {
    if (target.role !== 'STUDENT') return { error: 'You can only reset student passwords' };
    const allowed = await assertCanManageStudent(principal.id, target.classId);
    if (!allowed) return { error: 'This student is not in your classes' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { passwordHash: bcrypt.hashSync(input.newPassword, 10) },
    });
    await tx.auditLog.create({
      data: {
        actorId: principal.id,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: input.userId,
      },
    });
  });

  revalidatePath(`/users/${input.userId}`);
  return { ok: true };
}