import { PrismaClient, Role, Permission } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const hash = (plain: string) => bcrypt.hashSync(plain, 10);
const UPLOADS_DIR = join(process.cwd(), 'uploads');

async function main() {
  console.log('Seeding...');
  mkdirSync(UPLOADS_DIR, { recursive: true });

  // ── Clear existing data ────────────────────────────────────
  console.log('Clearing existing data...');
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.markRevision.deleteMany();
  await prisma.examMark.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.material.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.grievance.deleteMany();
  await prisma.appointmentRequest.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.feeTransaction.deleteMany();
  await prisma.feeRecord.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.teachingAssignment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();

  await prisma.user.updateMany({ data: { departmentId: null, classId: null } });
  await prisma.class.updateMany({ data: { inchargeId: null } });
  await prisma.department.updateMany({ data: { hodId: null } });

  await prisma.user.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.department.deleteMany();
  console.log('  ✓ Cleared');

  // ── Departments ────────────────────────────────────────────
  const cse = await prisma.department.create({
    data: { name: 'Computer Science', code: 'CSE' },
  });
  await prisma.department.create({
    data: { name: 'Electronics', code: 'ECE' },
  });
  console.log('  ✓ Departments');

  // ── HOD ────────────────────────────────────────────────────
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

  // ── Faculty ────────────────────────────────────────────────
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

  // ── Class ──────────────────────────────────────────────────
  const cls = await prisma.class.create({
    data: {
      name: 'CSE-3A',
      semester: 5,
      departmentId: cse.id,
      inchargeId: faculty.id,
    },
  });
  console.log('  ✓ Class');

  // ── Student ────────────────────────────────────────────────
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

  // ── Subjects ───────────────────────────────────────────────
  const ds = await prisma.subject.create({
    data: { code: 'CS501', name: 'Data Structures', semester: 5, departmentId: cse.id },
  });
  const dbms = await prisma.subject.create({
    data: { code: 'CS502', name: 'DBMS', semester: 5, departmentId: cse.id },
  });
  console.log('  ✓ Subjects');

  // ── Teaching assignments ───────────────────────────────────
  await prisma.teachingAssignment.createMany({
    data: [
      { facultyId: faculty.id, subjectId: ds.id, classId: cls.id },
      { facultyId: faculty.id, subjectId: dbms.id, classId: cls.id },
    ],
  });
  console.log('  ✓ Teaching assignments');

  // ── Weekly schedule ────────────────────────────────────────
  const slots: {
    classId: string;
    dayOfWeek: number;
    period: number;
    subjectId: string;
    facultyId: string;
    room: string;
    updatedById: string;
  }[] = [];

  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    slots.push({
      classId: cls.id,
      dayOfWeek,
      period: 1,
      subjectId: ds.id,
      facultyId: faculty.id,
      room: 'A-101',
      updatedById: faculty.id,
    });
    slots.push({
      classId: cls.id,
      dayOfWeek,
      period: 2,
      subjectId: dbms.id,
      facultyId: faculty.id,
      room: 'A-101',
      updatedById: faculty.id,
    });
  }
  await prisma.scheduleSlot.createMany({ data: slots });
  console.log('  ✓ Schedule (Mon–Fri)');

  // ── Fee record ─────────────────────────────────────────────
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

  // ── Leave requests ─────────────────────────────────────────
  await prisma.leaveRequest.create({
    data: {
      studentId: student.id,
      classId: cls.id,
      fromDate: new Date('2026-11-01'),
      toDate: new Date('2026-11-03'),
      body: "Attending a cousin's wedding.",
      status: 'PENDING',
    },
  });
  await prisma.leaveRequest.create({
    data: {
      studentId: student.id,
      classId: cls.id,
      fromDate: new Date('2026-10-15'),
      toDate: new Date('2026-10-17'),
      body: 'Family function out of town.',
      status: 'PENDING_HOD',
      inchargeId: faculty.id,
      inchargeAt: new Date('2026-10-08'),
      inchargeRemark: 'Approved. Please share notes with classmates.',
    },
  });
  await prisma.leaveRequest.create({
    data: {
      studentId: student.id,
      classId: cls.id,
      fromDate: new Date('2026-09-10'),
      toDate: new Date('2026-09-11'),
      body: 'Medical appointment.',
      status: 'APPROVED',
      inchargeId: faculty.id,
      inchargeAt: new Date('2026-09-05'),
      inchargeRemark: 'Approved.',
      hodId: hod.id,
      hodAt: new Date('2026-09-06'),
      hodRemark: 'Approved. Take rest.',
    },
  });
  await prisma.leaveRequest.create({
    data: {
      studentId: student.id,
      classId: cls.id,
      fromDate: new Date('2026-08-20'),
      toDate: new Date('2026-08-25'),
      body: 'Trip with friends.',
      status: 'REJECTED',
      inchargeId: faculty.id,
      inchargeAt: new Date('2026-08-15'),
      inchargeRemark: 'Too many days during term time.',
    },
  });
  console.log('  ✓ Leave requests (4)');

  // ── Notices ────────────────────────────────────────────────
  await prisma.notice.createMany({
    data: [
      {
        authorId: hod.id,
        scope: 'COLLEGE',
        title: 'Annual sports day — Nov 15',
        body: 'The college annual sports day will be held on November 15. All students are encouraged to participate. Registration opens next week at the sports office.',
        important: true,
      },
      {
        authorId: hod.id,
        scope: 'DEPARTMENT',
        departmentId: cse.id,
        title: 'Mid-semester exams begin Oct 20',
        body: 'The detailed timetable will be posted by the end of this week. Attendance is mandatory.',
        important: true,
      },
      {
        authorId: hod.id,
        scope: 'SEMESTER',
        departmentId: cse.id,
        semester: 5,
        title: 'Semester 5 lab slots reshuffled',
        body: 'Due to the new timetable, Wednesday and Friday lab slots have been swapped starting next week.',
      },
      {
        authorId: faculty.id,
        scope: 'CLASS',
        departmentId: cse.id,
        classId: cls.id,
        title: 'DBMS assignment due Oct 25',
        body: 'Submit your normalization exercise as a PDF to the portal before 5 PM on Oct 25. Late submissions lose 20% of the marks.',
        important: true,
      },
      {
        authorId: faculty.id,
        scope: 'CLASS',
        departmentId: cse.id,
        classId: cls.id,
        title: 'Data Structures extra class',
        body: 'I will hold an extra session on Saturday morning at 9 AM to cover the graphs topic. Attendance is optional but recommended.',
      },
    ],
  });
  console.log('  ✓ Notices (5)');

  // ── Materials + placeholder files ──────────────────────────
  const seedMaterials = [
    {
      key: 'seed-ds-lecture-notes',
      fileName: 'DS-Lecture-Notes-Week1.txt',
      subjectId: ds.id,
      title: 'Data Structures — Week 1 lecture notes',
      description: 'Introduction to arrays, linked lists, and time complexity.',
      type: 'NOTES' as const,
      content: 'Data Structures Week 1 — placeholder file.\nTopics: arrays, linked lists, big-O notation.\n',
    },
    {
      key: 'seed-ds-lab-manual',
      fileName: 'DS-Lab-Manual.txt',
      subjectId: ds.id,
      title: 'Data Structures lab manual',
      description: 'Lab exercises for the full semester.',
      type: 'LAB_MANUAL' as const,
      content: 'Lab manual placeholder.\nTen exercises covering stacks, queues, trees, graphs.\n',
    },
    {
      key: 'seed-dbms-normalization',
      fileName: 'DBMS-Normalization-Notes.txt',
      subjectId: dbms.id,
      title: 'DBMS — Normalization notes',
      description: 'Covers 1NF through BCNF with examples.',
      type: 'NOTES' as const,
      content: 'Normalization notes placeholder.\n1NF, 2NF, 3NF, BCNF explained with examples.\n',
    },
    {
      key: 'seed-dbms-question-paper',
      fileName: 'DBMS-Midterm-2025.txt',
      subjectId: dbms.id,
      title: 'DBMS — Previous midterm paper',
      description: 'From last year, for practice.',
      type: 'QUESTION_PAPER' as const,
      content: 'Question paper placeholder.\nSection A: short answers. Section B: SQL queries.\n',
    },
  ];

  for (const m of seedMaterials) {
    writeFileSync(join(UPLOADS_DIR, m.key), m.content);
    await prisma.material.create({
      data: {
        subjectId: m.subjectId,
        classId: cls.id,
        uploadedById: faculty.id,
        title: m.title,
        description: m.description,
        type: m.type,
        fileKey: m.key,
        fileName: m.fileName,
        sizeBytes: Buffer.byteLength(m.content, 'utf8'),
      },
    });
  }
  console.log(`  ✓ Materials (${seedMaterials.length}) + placeholder files on disk`);

  // ── Attendance history ─────────────────────────────────────
  const pattern: Array<'PRESENT' | 'ABSENT' | 'LATE'> = [
    'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'PRESENT',
    'PRESENT', 'LATE',    'PRESENT', 'PRESENT', 'PRESENT',
    'ABSENT',  'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT',
    'ABSENT',  'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT',
  ];
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (days.length < 10) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  let idx = 0;
  for (const day of days) {
    for (const subject of [ds, dbms]) {
      const session = await prisma.attendanceSession.create({
        data: {
          classId: cls.id,
          subjectId: subject.id,
          date: day,
          period: subject.id === ds.id ? 1 : 2,
          markedById: faculty.id,
        },
      });
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: student.id,
          status: pattern[idx % pattern.length],
        },
      });
      idx++;
    }
  }
  console.log('  ✓ Attendance history (10 days)');

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