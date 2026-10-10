
import type { Principal } from './principal';

export type SectionKey =
  | 'attendance'
  | 'leave'
  | 'materials'
  | 'notices'
  | 'grievance'
  | 'appointments'
  | 'calendar'
  | 'fees'
  | 'schedule'
  | 'results';

export type Section = {
  key: SectionKey;
  label: string;
  href: string;
  visible: (p: Principal) => boolean;
};

const isStudent = (p: Principal) => p.role === 'STUDENT';
const isFaculty = (p: Principal) => p.role === 'FACULTY';
const isHod = (p: Principal) => p.role === 'HOD';
const isAdmin = (p: Principal) => p.role === 'ADMIN';

const studentOrStaffWithPermission = (perm: string) => (p: Principal) =>
  isStudent(p) ||
  isHod(p) ||
  isAdmin(p) ||
  (p.permissions as string[]).includes(perm);

export const SECTIONS: Section[] = [
  {
    key: 'attendance',
    label: 'Attendance',
    href: '/attendance',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'schedule',
    label: 'Schedule',
    href: '/schedule',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'leave',
    label: 'Leave',
    href: '/leave',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'materials',
    label: 'Materials',
    href: '/materials',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'notices',
    label: 'Notices',
    href: '/notices',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'results',
    label: 'Results',
    href: '/results',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'appointments',
    label: 'Appointments',
    href: '/appointments',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
  {
    key: 'grievance',
    label: 'Grievance',
    href: '/grievance',
    visible: studentOrStaffWithPermission('GRIEVANCE'),
  },
  {
    key: 'fees',
    label: 'Fees',
    href: '/fees',
    visible: (p) =>
      isStudent(p) || isFaculty(p) || isHod(p) || isAdmin(p),
  },
];
