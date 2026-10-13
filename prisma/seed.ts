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
    // ── Admin ──────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@college.edu',
      name: 'System Admin',
      role: Role.ADMIN,
      passwordHash: hash('password'),
    },
  });
  console.log('  ✓ Admin');
    // ── COE staff (college-wide, no department) ────────────────
  const coe = await prisma.user.create({
    data: {
      username: 'coe',
      email: 'coe@college.edu',
      name: 'Dr. Menon',
      role: Role.COE,
      passwordHash: hash('password'),
    },
  });

  await prisma.user.create({
    data: {
      username: 'coe.staff',
      email: 'coe.staff@college.edu',
      name: 'Anita R',
      role: Role.COE_STAFF,
      passwordHash: hash('password'),
    },
  });
  console.log('  ✓ COE + COE staff');

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

  // ── Accounts user (college-wide, no department) ────────────
  await prisma.user.create({
    data: {
      username: 'accounts',
      email: 'accounts@college.edu',
      name: 'Meena S',
      role: Role.ACCOUNTS,
      passwordHash: hash('password'),
    },
  });
  console.log('  ✓ Accounts');

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
  console.log('  ✓ Faculty (Iyer)');

  // ── Second faculty ─────────────────────────────────────────
  const faculty2 = await prisma.user.create({
    data: {
      username: 'faculty2.cse',
      email: 'faculty2.cse@college.edu',
      name: 'Prof. Kumar',
      role: Role.FACULTY,
      passwordHash: hash('password'),
      departmentId: cse.id,
    },
  });
  console.log('  ✓ Faculty (Kumar)');

  // ── Class CSE-3A ───────────────────────────────────────────
  const cls = await prisma.class.create({
    data: {
      name: 'CSE-3A',
      semester: 5,
      departmentId: cse.id,
      inchargeId: faculty.id,
    },
  });

  // ── Class CSE-3B ───────────────────────────────────────────
  const cls2 = await prisma.class.create({
    data: {
      name: 'CSE-3B',
      semester: 5,
      departmentId: cse.id,
      inchargeId: faculty2.id,
    },
  });
  console.log('  ✓ Classes (CSE-3A, CSE-3B)');

  // ── Students ───────────────────────────────────────────────
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

  await prisma.user.create({
    data: {
      username: 'student2.cse',
      email: 'student2.cse@college.edu',
      name: 'Rahul M',
      role: Role.STUDENT,
      passwordHash: hash('password'),
      departmentId: cse.id,
      classId: cls2.id,
    },
  });
  console.log('  ✓ Students (Asha, Rahul)');

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
      { facultyId: faculty2.id, subjectId: ds.id, classId: cls2.id },
      { facultyId: faculty2.id, subjectId: dbms.id, classId: cls2.id },
    ],
  });
  console.log('  ✓ Teaching assignments');

  // ── Weekly schedule (Mon–Fri, P1 = DS, P2 = DBMS) ──────────
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
    // CSE-3A, Iyer, P1 = DS, P2 = DBMS
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

    // CSE-3B, Kumar, P1 = DS, P2 = DBMS
    slots.push({
      classId: cls2.id,
      dayOfWeek,
      period: 1,
      subjectId: ds.id,
      facultyId: faculty2.id,
      room: 'A-102',
      updatedById: faculty2.id,
    });
    slots.push({
      classId: cls2.id,
      dayOfWeek,
      period: 2,
      subjectId: dbms.id,
      facultyId: faculty2.id,
      room: 'A-102',
      updatedById: faculty2.id,
    });
  }

  await prisma.scheduleSlot.createMany({ data: slots });
  console.log('  ✓ Schedule (Mon–Fri, 20 slots)');

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
      requesterId: student.id,
      classId: cls.id,
      fromDate: new Date('2026-11-01'),
      toDate: new Date('2026-11-03'),
      body: "Attending a cousin's wedding.",
      status: 'PENDING',
    },
  });
  await prisma.leaveRequest.create({
    data: {
      requesterId: student.id,
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
      requesterId: student.id,
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
      requesterId: student.id,
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
  console.log('  ✓ Leave requests — students (4)');

  // Faculty leave requests
  await prisma.leaveRequest.create({
    data: {
      requesterId: faculty.id,
      fromDate: new Date('2026-11-05'),
      toDate: new Date('2026-11-06'),
      body: 'Attending a family wedding out of town.',
      status: 'PENDING_HOD',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      requesterId: faculty2.id,
      fromDate: new Date('2026-09-15'),
      toDate: new Date('2026-09-16'),
      body: 'Medical checkup.',
      status: 'APPROVED',
      hodId: hod.id,
      hodAt: new Date('2026-09-10'),
      hodRemark: 'Approved. Arrange a substitute for your classes.',
    },
  });

  await prisma.leaveRequest.create({
    data: {
      requesterId: faculty.id,
      fromDate: new Date('2026-08-01'),
      toDate: new Date('2026-08-10'),
      body: 'Extended vacation.',
      status: 'REJECTED',
      hodId: hod.id,
      hodAt: new Date('2026-07-28'),
      hodRemark: 'Too long during term time. Please submit a shorter request.',
    },
  });
  console.log('  ✓ Leave requests — faculty (3)');
    // ── Availability slots ─────────────────────────────────────
  // Give Dr. Rao slots this week
  const now = new Date();
  const baseDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  function slotAt(dayOffset: number, hourUTC: number, durationMin: number) {
    const start = new Date(baseDate);
    start.setUTCDate(baseDate.getUTCDate() + dayOffset);
    start.setUTCHours(hourUTC, 0, 0, 0);
    const end = new Date(start);
    end.setUTCMinutes(end.getUTCMinutes() + durationMin);
    return { startAt: start, endAt: end };
  }

  const hodSlots = [
    { ...slotAt(1, 10, 30), location: 'Cabin B-201' },
    { ...slotAt(1, 14, 30), location: 'Cabin B-201' },
    { ...slotAt(2, 11, 30), location: 'Cabin B-201' },
    { ...slotAt(3, 15, 30), location: 'Cabin B-201' },
    { ...slotAt(5, 9, 30), location: 'Cabin B-201' },
  ];

  for (const s of hodSlots) {
    await prisma.availabilitySlot.create({
      data: {
        staffId: hod.id,
        startAt: s.startAt,
        endAt: s.endAt,
        location: s.location,
      },
    });
  }
  console.log(`  ✓ Availability slots (${hodSlots.length} for Dr. Rao)`);

  // One pending appointment request from the student
  const firstSlot = await prisma.availabilitySlot.findFirst({
    where: { staffId: hod.id },
    orderBy: { startAt: 'asc' },
  });
  if (firstSlot) {
    await prisma.availabilitySlot.update({
      where: { id: firstSlot.id },
      data: { isBooked: true },
    });
    await prisma.appointmentRequest.create({
      data: {
        studentId: student.id,
        staffId: hod.id,
        slotId: firstSlot.id,
        reason:
          'Would like to discuss my semester project direction and possible research areas.',
        status: 'PENDING',
        preferredAt: firstSlot.startAt,
      },
    });
  }
  console.log('  ✓ Appointment request (1 pending)');
    // ── Grievances ─────────────────────────────────────────────
  await prisma.grievance.create({
    data: {
      studentId: student.id,
      departmentId: cse.id,
      type: 'Academic',
      details: 'The projector in A-101 has been broken for two weeks. It makes it difficult to follow some lectures.',
      status: 'PENDING',
    },
  });

  await prisma.grievance.create({
    data: {
      studentId: student.id,
      departmentId: cse.id,
      type: 'Facility',
      details: 'Requesting an extra charging point in the CSE lab. Only two sockets work at the back row.',
      status: 'IN_PROGRESS',
      assignedToId: faculty.id,
    },
  });

  await prisma.grievance.create({
    data: {
      studentId: student.id,
      departmentId: cse.id,
      type: 'Academic',
      details: 'The DBMS reference book in the library is missing two chapters.',
      status: 'RESOLVED',
      assignedToId: faculty.id,
      response: 'A replacement copy has been ordered and should arrive next week. Marking this as resolved.',
      resolvedAt: new Date('2026-10-05'),
    },
  });

  await prisma.grievance.create({
    data: {
      studentId: (await prisma.user.findFirstOrThrow({ where: { username: 'student2.cse' } })).id,
      departmentId: cse.id,
      type: 'Other',
      details: 'The drinking water cooler on the second floor is not working.',
      status: 'PENDING',
    },
  });
  console.log('  ✓ Grievances (4)');

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
    // ── Calendar events ────────────────────────────────────────
  await prisma.calendarEvent.createMany({
    data: [
      {
        title: 'Annual Sports Day',
        details: 'Full-day inter-department sports meet at the college grounds. All students are encouraged to participate.',
        scope: 'COLLEGE',
        startAt: new Date('2026-11-15T09:00:00Z'),
        endAt: new Date('2026-11-15T17:00:00Z'),
        createdById: hod.id,
      },
      {
        title: 'Mid-semester exams begin',
        details: 'Exams run from Oct 20 to Oct 30. Detailed timetable will be posted on the notice board.',
        scope: 'DEPARTMENT',
        departmentId: cse.id,
        startAt: new Date('2026-10-20T09:00:00Z'),
        createdById: hod.id,
      },
      {
        title: 'Semester 5 lab exam week',
        details: 'Lab exams for all semester 5 subjects.',
        scope: 'SEMESTER',
        departmentId: cse.id,
        semester: 5,
        startAt: new Date('2026-11-10T09:00:00Z'),
        endAt: new Date('2026-11-14T17:00:00Z'),
        createdById: hod.id,
      },
      {
        title: 'DBMS practical submission',
        details: 'Submit your DBMS practical file to Prof. Iyer before 5 PM.',
        scope: 'CLASS',
        departmentId: cse.id,
        classId: cls.id,
        startAt: new Date('2026-10-25T17:00:00Z'),
        createdById: faculty.id,
      },
      {
        title: 'DS viva',
        details: 'Viva for Data Structures. Check the notice board for the slot schedule.',
        scope: 'CLASS',
        departmentId: cse.id,
        classId: cls2.id,
        startAt: new Date('2026-10-28T09:00:00Z'),
        createdById: faculty2.id,
      },
      {
        title: 'Industrial visit',
        details: 'One-day visit to TechPark. Registration fee ₹500. Sign up at the department office by Nov 10.',
        scope: 'DEPARTMENT',
        departmentId: cse.id,
        startAt: new Date('2026-11-20T08:00:00Z'),
        endAt: new Date('2026-11-20T18:00:00Z'),
        createdById: hod.id,
      },
    ],
  });
  console.log('  ✓ Calendar events (6)');

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

  // ── Attendance history (10 weekdays, 2 sessions each) ──────
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
    // ── Sample exams (no marks yet) ────────────────────────────
  await prisma.exam.create({
    data: {
      name: 'Mid-Semester Exam — October 2026',
      kind: 'INTERNAL',
      session: '2026-27 Odd',
      departmentId: cse.id,
      semester: 5,
      createdById: hod.id,
    },
  });

  await prisma.exam.create({
    data: {
      name: 'End Semester Exam — Nov 2026',
      kind: 'END_SEMESTER',
      session: '2026-27 Odd',
      departmentId: null,
      semester: 5,
      createdById: coe.id,
    },
  });
  console.log('  ✓ Exams (1 internal + 1 end-semester)');

  console.log('\nDone.\n');
  console.log('Logins (all passwords are "password"):');
  console.log('  hod.cse        → HOD, CSE');
  console.log('  faculty.cse    → Faculty, incharge of CSE-3A');
  console.log('  faculty2.cse   → Faculty, incharge of CSE-3B');
  console.log('  student.cse    → Student, CSE-3A');
  console.log('  student2.cse   → Student, CSE-3B');
  console.log('  accounts       → Accounts, college-wide');
  console.log('  admin          → Admin, full access');
  console.log('  coe            → Controller of Examinations');
  console.log('  coe.staff      → COE cell staff');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });