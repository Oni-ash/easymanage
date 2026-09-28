import { PrismaClient, Role, Permission } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = (plain: string) => bcrypt.hashSync(plain, 10);

async function main() {
  console.log('Seeding...');

  // ── Departments ────────────────────────────────────────────
  const cse = await prisma.department.create({
    data: { name: 'Computer Science', code: 'CSE' },
  });
  const ece = await prisma.department.create({
    data: { name: 'Electronics', code: 'ECE' },
  });
  console.log('  ✓ Departments');

  // ── HOD for CSE ────────────────────────────────────────────
  const hod = await prisma.user.create({
    data: {
      username: 'hod.cse',
      email: 'hod.cse@college.edu',
      name: 'Dr. Rao',
      role: Role.HOD,
      passwordHash: hash('password'),
      departmentId: cse.id,
      permissions: [
        Permission.GRIEVANCE,
        Permission.FEE,
        Permission.CALENDAR_EDIT,
        Permission.RESULTS_PUBLISH,
      ],
    },
  });
  await prisma.department.update({
    where: { id: cse.id },
    data: { hodId: hod.id },
  });
  console.log('  ✓ HOD');

  // ── Faculty (class incharge of CSE-3A, has grievance access) ─
  const faculty = await prisma.user.create({
    data: {
      username: 'faculty.cse',
      email: 'faculty.cse@college.edu',
      name: 'Prof. Iyer',
      role: Role.FACULTY,
      passwordHash: hash('password'),
      departmentId: cse.id,
      permissions: [Permission.GRIEVANCE],
    },
  });
  console.log('  ✓ Faculty');

  // ── Class CSE-3A, assigned to faculty as incharge ──────────
  const cls = await prisma.class.create({
    data: {
      name: 'CSE-3A',
      semester: 5,
      departmentId: cse.id,
      inchargeId: faculty.id,
    },
  });
  console.log('  ✓ Class');

  // ── Student in CSE-3A ──────────────────────────────────────
  const student = await prisma.user.create({
    data: {
      username: 'student.cse',
      email: 'student.cse@college.edu',
      name: 'Asha K',
      role: Role.STUDENT,
      passwordHash: hash('password'),
      departmentId: cse.id,
      classId: cls.id,
    },
  });
  console.log('  ✓ Student');

  // ── Subjects (semester 5) ──────────────────────────────────
  const ds = await prisma.subject.create({
    data: { code: 'CS501', name: 'Data Structures', semester: 5, departmentId: cse.id },
  });
  const dbms = await prisma.subject.create({
    data: { code: 'CS502', name: 'DBMS', semester: 5, departmentId: cse.id },
  });
  console.log('  ✓ Subjects');

  // ── Faculty teaches both subjects to CSE-3A ────────────────
  await prisma.teachingAssignment.createMany({
    data: [
      { facultyId: faculty.id, subjectId: ds.id, classId: cls.id },
      { facultyId: faculty.id, subjectId: dbms.id, classId: cls.id },
    ],
  });
  console.log('  ✓ Teaching assignments');

  // ── Weekly schedule: Mon period 1 = DS, period 2 = DBMS ────
  await prisma.scheduleSlot.createMany({
    data: [
      {
        classId: cls.id,
        dayOfWeek: 1,
        period: 1,
        subjectId: ds.id,
        facultyId: faculty.id,
        room: 'A-101',
        updatedById: faculty.id,
      },
      {
        classId: cls.id,
        dayOfWeek: 1,
        period: 2,
        subjectId: dbms.id,
        facultyId: faculty.id,
        room: 'A-101',
        updatedById: faculty.id,
      },
    ],
  });
  console.log('  ✓ Schedule');

  // ── Fee record for the student, with one payment made ──────
  const fee = await prisma.feeRecord.create({
    data: {
      studentId: student.id,
      totalAmount: '50000.00',
      dueDate: new Date('2026-12-31'),
    },
  });
  await prisma.feeTransaction.create({
    data: {
      feeRecordId: fee.id,
      amount: '25000.00',
      recordedById: hod.id,
      note: 'First installment',
    },
  });
  console.log('  ✓ Fee record + transaction');

  // ── One leave request, sitting at HOD stage ────────────────
  await prisma.leaveRequest.create({
    data: {
      studentId: student.id,
      classId: cls.id,
      fromDate: new Date('2026-10-05'),
      toDate: new Date('2026-10-07'),
      body: 'Family function out of town.',
      status: 'PENDING_HOD',
      inchargeId: faculty.id,
      inchargeAt: new Date(),
      inchargeRemark: 'Approved. Please share notes with classmates.',
    },
  });
  console.log('  ✓ Leave request');

  // ── One notice from HOD to the whole department ────────────
  await prisma.notice.create({
    data: {
      authorId: hod.id,
      scope: 'DEPARTMENT',
      departmentId: cse.id,
      title: 'Mid-semester exams begin Oct 20',
      body: 'The detailed timetable will be posted by the end of this week. Attendance is mandatory.',
      important: true,
    },
  });
  console.log('  ✓ Notice');

  console.log('\nDone.\n');
  console.log('Logins (all passwords are "password"):');
  console.log('  hod.cse       → HOD, CSE');
  console.log('  faculty.cse   → Faculty, class incharge of CSE-3A');
  console.log('  student.cse   → Student, CSE-3A');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });