import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

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
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  return `EM-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET() {
  try {
    const principal = await getPrincipal();

    if (!principal) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Students can view their own fee details only.
    if (principal.role === 'STUDENT') {
      const fee = await prisma.feeRecord.findUnique({
        where: { studentId: principal.id },
        include: {
          transactions: {
            orderBy: { paidAt: 'desc' },
          },
        },
      });

      return NextResponse.json({ fee });
    }

    let departmentId: string | null = null;
    let classIds: string[] | null = null;

    if (principal.role === 'HOD') {
      departmentId = await getAuthorizedDepartmentId(principal);

      if (!departmentId) {
        return NextResponse.json(
          { error: 'Your account is not assigned as a department HOD' },
          { status: 403 },
        );
      }
    } else if (principal.role === 'FACULTY') {
      // Include classes where this faculty is in-charge or teaches.
      const assignments = await prisma.teachingAssignment.findMany({
        where: { facultyId: principal.id },
        select: { classId: true },
      });

      classIds = [
        ...new Set([
          ...principal.inchargeOf.map((cls) => cls.id),
          ...assignments.map((assignment) => assignment.classId),
        ]),
      ];

      if (classIds.length === 0) {
        return NextResponse.json({
          students: [],
          canRecordPayments: false,
        });
      }
    } else if (principal.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 },
      );
    }

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        active: true,
        ...(departmentId ? { departmentId } : {}),
        ...(classIds ? { classId: { in: classIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        class: {
          select: { id: true, name: true },
        },
        feeRecord: {
          include: {
            transactions: {
              orderBy: { paidAt: 'desc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      students,
      canRecordPayments:
        principal.role === 'HOD' || principal.role === 'ADMIN',
    });
  } catch (error) {
    console.error('GET /api/fees failed:', error);

    return NextResponse.json(
      { error: 'Unable to load fee details' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const principal = await getPrincipal();

    if (!principal) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Faculty and students cannot record fee payments.
    if (principal.role !== 'HOD' && principal.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only HOD or Admin can record payments' },
        { status: 403 },
      );
    }

    let departmentId: string | null = null;

    if (principal.role === 'HOD') {
      departmentId = await getAuthorizedDepartmentId(principal);

      if (!departmentId) {
        return NextResponse.json(
          { error: 'Your account is not assigned as a department HOD' },
          { status: 403 },
        );
      }
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
    };

    const utr = 'utr' in body ? body.utr : undefined;

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

    const student = await prisma.user.findFirst({
      where: {
        id: studentId.trim(),
        role: 'STUDENT',
        active: true,
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        id: true,
        feeRecord: {
          select: {
            id: true,
            totalAmount: true,
            transactions: {
              select: { amount: true },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found or outside your department' },
        { status: 404 },
      );
    }

    if (!student.feeRecord) {
      return NextResponse.json(
        { error: 'This student has no fee record yet' },
        { status: 400 },
      );
    }

    const total = Number(student.feeRecord.totalAmount);
    const paid = student.feeRecord.transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );
    const pending = Math.max(0, total - paid);

    if (amount > pending) {
      return NextResponse.json(
        {
          error: `Payment exceeds the pending amount (${pending.toFixed(2)})`,
        },
        { status: 400 },
      );
    }

    const transaction = await prisma.feeTransaction.create({
      data: {
        feeRecordId: student.feeRecord.id,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        recordedById: principal.id,
        receiptNumber: generateReceiptNumber(),
        utr:
          typeof utr === 'string' && utr.trim()
            ? utr.trim()
            : null,
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('POST /api/fees failed:', error);

    return NextResponse.json(
      { error: 'Unable to record payment' },
      { status: 500 },
    );
  }
}
