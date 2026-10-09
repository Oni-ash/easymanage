import type { Principal } from './principal';

export const isStudent = (p: Principal) => p.role === 'STUDENT';
export const isFaculty = (p: Principal) => p.role === 'FACULTY';
export const isHod = (p: Principal) => p.role === 'HOD';
export const isAdmin = (p: Principal) => p.role === 'ADMIN';
export const isStaff = (p: Principal) => isFaculty(p) || isHod(p) || isAdmin(p);

export const hasPermission = (p: Principal, perm: string) =>
  (p.permissions as string[]).includes(perm);

/** Does this principal belong to this department? */
export function inDepartment(p: Principal, departmentId: string | null): boolean {
  if (isAdmin(p)) return true;
  if (!departmentId) return false;
  return p.departmentId === departmentId;
}

/** May this principal see or modify data belonging to this class? */
export function canTouchClass(
  p: Principal,
  classId: string,
  departmentId: string | null,
): boolean {
  if (isAdmin(p)) return true;
  if (isHod(p)) return inDepartment(p, departmentId);
  if (isStudent(p)) return p.classId === classId;
  // Faculty: only if they teach the class or are its incharge
  return p.inchargeOf.some((c) => c.id === classId);
}

/** Prisma where-clause fragment: the classes this principal is allowed to see. */
export function classScope(p: Principal): Record<string, unknown> {
  if (isAdmin(p)) return {};
  if (isHod(p)) return { departmentId: p.departmentId ?? '__none__' };
  if (isStudent(p)) return { id: p.classId ?? '__none__' };
  // Faculty: classes they teach, or are incharge of
  return {
    OR: [
      { inchargeId: p.id },
      { teaching: { some: { facultyId: p.id } } },
    ],
  };
}