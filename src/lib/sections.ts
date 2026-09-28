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

const everyone = () => true;

const hasPermission = (perm: string) => (p: Principal) =>
  (p.permissions as string[]).includes(perm);

const studentOrStaffWithPermission = (perm: string) => (p: Principal) =>
  p.role === 'STUDENT' ||
  p.role === 'HOD' ||
  p.role === 'ADMIN' ||
  hasPermission(perm)(p);

export const SECTIONS: Section[] = [
  { key: 'attendance',   label: 'Attendance',   href: '/attendance',   visible: everyone },
  { key: 'schedule',     label: 'Schedule',     href: '/schedule',     visible: everyone },
  { key: 'leave',        label: 'Leave',        href: '/leave',        visible: everyone },
  { key: 'materials',    label: 'Materials',    href: '/materials',    visible: everyone },
  { key: 'notices',      label: 'Notices',      href: '/notices',      visible: everyone },
  { key: 'calendar',     label: 'Calendar',     href: '/calendar',     visible: everyone },
  { key: 'results',      label: 'Results',      href: '/results',      visible: everyone },
  { key: 'appointments', label: 'Appointments', href: '/appointments', visible: everyone },
  { key: 'grievance',    label: 'Grievance',    href: '/grievance',    visible: studentOrStaffWithPermission('GRIEVANCE') },
  { key: 'fees',         label: 'Fees',         href: '/fees',         visible: studentOrStaffWithPermission('FEE') },
];