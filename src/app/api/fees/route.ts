import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ───────────────────────── Helpers ─────────────────────────

async function getAuthorizedDepartmentId(
  principal: Awaited<ReturnType<typeof getPrincipal>>,
) {
  if (!principal || principal.role !== 'HOD') return null;
  const department = await prisma.department.findFirst({
    where: { hodId: principal.id },
    select: { id: true },
  });
  return department?.id ?? null;
}

function generateReceiptNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `EM-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

type Principal = NonNullable<Awaited<ReturnType<typeof getPrincipal>>>;

function canRecordPayments(p: Principal): boolean {
  return p.role === 'ACCOUNTS' || p.role === 'ADMIN';
}

// ───────────────────────── GET ─────────────────────────────

export async function GET() {
  try {
    const principal = await getPrincipal();
    if (!principal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRecord = canRecordPayments(principal);

    // Students: only their own fee record.
    if (principal.role === 'STUDENT') {
      const fee = await prisma.feeRecord.findUnique({
        where: { studentId: principal.id },
        include: { transactions: { orderBy: { paidAt: 'desc' } } },
      });
      return NextResponse.json({ fee, role: principal.role });
    }

    // ACCOUNTS and ADMIN: everyone in the college.
    if (principal.role === 'ACCOUNTS' || principal.role === 'ADMIN') {
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', active: true },
        select: {
          id: true,
          name: true,
          username: true,
          class: { select: { id: true, name: true } },
          feeRecord: {
            include: { transactions: { orderBy: { paidAt: 'desc' } } },
          },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ students, canRecordPayments: canRecord, role: principal.role });
    }

    // HOD: their department only. Read-only.
    if (principal.role === 'HOD') {
      const departmentId = await getAuthorizedDepartmentId(principal);
      if (!departmentId) {
        return NextResponse.json(
          { error: 'Your account is not assigned as a department HOD' },
          { status: 403 },
        );
      }
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', active: true, departmentId },
        select: {
          id: true,
          name: true,
          username: true,
          class: { select: { id: true, name: true } },
          feeRecord: {
            include: { transactions: { orderBy: { paidAt: 'desc' } } },
          },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({
        students,
        canRecordPayments: false, // HOD is read-only
        role: principal.role,
      });
    }

    // FACULTY: only if they have the FEE permission. Their classes only.
    if (principal.role === 'FACULTY') {
      if (!(principal.permissions as string[]).includes('FEE')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const assignments = await prisma.teachingAssignment.findMany({
        where: { facultyId: principal.id },
        select: { classId: true },
      });
      const classIds = [
        ...new Set([
          ...principal.inchargeOf.map((c) => c.id),
          ...assignments.map((a) => a.classId),
        ]),
      ];

      if (classIds.length === 0) {
        return NextResponse.json({
          students: [],
          canRecordPayments: false,
          role: principal.role,
        });
      }

      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', active: true, classId: { in: classIds } },
        select: {
          id: true,
          name: true,
          username: true,
          class: { select: { id: true, name: true } },
          feeRecord: {
            include: { transactions: { orderBy: { paidAt: 'desc' } } },
          },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({
        students,
        canRecordPayments: false,
        role: principal.role,
      });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('GET /api/fees failed:', error);
    return NextResponse.json(
      { error: 'Unable to load fee details' },
      { status: 500 },
    );
  }
}

// ───────────────────────── POST ────────────────────────────

export async function POST(request: Request) {
  try {
    const principal = await getPrincipal();
    if (!principal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ACCOUNTS and ADMIN can record payments.
    if (!canRecordPayments(principal)) {
      return NextResponse.json(
        { error: 'Only accounts staff or admin can record payments' },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 },
      );
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !('studentId' in body) ||
      !('amount' in body)
    ) {
      return NextResponse.json(
        { error: 'studentId and amount are required' },
        { status: 400 },
      );
    }

    const { studentId, amount } = body as {
      studentId: unknown;
      amount: unknown;
      utr?: unknown;
      totalAmount?: unknown;
      dueDate?: unknown;
    };

    const utr = 'utr' in body ? body.utr : undefined;
    const totalAmount = 'totalAmount' in body ? body.totalAmount : undefined;
    const dueDate = 'dueDate' in body ? body.dueDate : undefined;

    if (
      typeof studentId !== 'string' ||
      !studentId.trim() ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.round(amount * 100) !== amount * 100
    ) {
      return NextResponse.json(
        { error: 'Enter a valid student ID and positive amount (up to 2 decimals)' },
        { status: 400 },
      );
    }

    if (
      utr !== undefined &&
      utr !== null &&
      (typeof utr !== 'string' || utr.trim().length > 100)
    ) {
      return NextResponse.json(
        { error: 'UTR must be text with a maximum of 100 characters' },
        { status: 400 },
      );
    }

    // Load the student (no department restriction — accounts work college-wide).
    const student = await prisma.user.findFirst({
      where: { id: studentId.trim(), role: 'STUDENT', active: true },
      select: {
        id: true,
        departmentId: true,
        feeRecord: {
          select: {
            id: true,
            totalAmount: true,
            transactions: { select: { amount: true } },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // If the student has no fee record yet, require totalAmount and dueDate to create one.
    let feeRecordId: string;
    if (!student.feeRecord) {
      if (
        typeof totalAmount !== 'number' ||
        !Number.isFinite(totalAmount) ||
        totalAmount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'This student has no fee record yet. Provide totalAmount and dueDate to create one.',
          },
          { status: 400 },
        );
      }
      if (typeof dueDate !== 'string' || !dueDate) {
        return NextResponse.json(
          { error: 'dueDate is required to create a fee record' },
          { status: 400 },
        );
      }

      const created = await prisma.feeRecord.create({
        data: {
          studentId: student.id,
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          dueDate: new Date(dueDate),
        },
      });
      feeRecordId = created.id;
    } else {
      feeRecordId = student.feeRecord.id;
    }

    // Atomic: re-check pending inside the transaction, then insert.
    let pendingExceeded: number | null = null;
    let transaction;

    try {
      transaction = await prisma.$transaction(async (tx) => {
        const fresh = await tx.feeRecord.findUnique({
          where: { id: feeRecordId },
          select: {
            totalAmount: true,
            transactions: { select: { amount: true } },
          },
        });
        if (!fresh) throw new Error('Fee record disappeared');

        const total = Number(fresh.totalAmount);
        const paid = fresh.transactions.reduce(
          (s, t) => s + Number(t.amount),
          0,
        );
        const pending = Math.max(0, total - paid);

        if (amount > pending) {
          pendingExceeded = pending;
          throw new Error('PENDING_EXCEEDED');
        }

        const t = await tx.feeTransaction.create({
          data: {
            feeRecordId,
            amount: new Prisma.Decimal(amount.toFixed(2)),
            recordedById: principal.id,
            receiptNumber: generateReceiptNumber(),
            utr: typeof utr === 'string' && utr.trim() ? utr.trim() : null,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: principal.id,
            action: 'FEE_PAYMENT_RECORDED',
            entity: 'FeeTransaction',
            entityId: t.id,
            meta: {
              studentId: student.id,
              amount,
              receiptNumber: t.receiptNumber,
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: student.id,
            title: `Fee payment recorded: ₹${amount.toFixed(2)}`,
            body: `Receipt ${t.receiptNumber ?? ''}`.trim(),
            link: '/fees',
          },
        });

        return t;
      });
    } catch (e) {
      if (pendingExceeded !== null) {
        return NextResponse.json(
          {
            error: `Payment exceeds the pending amount (${pendingExceeded.toFixed(2)})`,
          },
          { status: 400 },
        );
      }
      throw e;
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('POST /api/fees failed:', error);
    return NextResponse.json(
      { error: 'Unable to record payment' },
      { status: 500 },
    );
  }
}