import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { readStoredFile } from '@/lib/storage';

type Params = Promise<{ grievanceId: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const { grievanceId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id, active: true },
    select: { id: true, role: true, departmentId: true, permissions: true },
  });
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    select: {
      studentId: true,
      departmentId: true,
      attachmentKey: true,
    },
  });
  if (!grievance) return new NextResponse('Not found', { status: 404 });
  if (!grievance.attachmentKey) return new NextResponse('No attachment', { status: 404 });

  const isOwner = grievance.studentId === user.id;
  const isStaff =
    (user.role === 'HOD' || user.role === 'ADMIN') &&
    user.departmentId === grievance.departmentId;
  const isFacultyWithPermission =
    user.role === 'FACULTY' &&
    user.departmentId === grievance.departmentId &&
    (user.permissions as string[]).includes('GRIEVANCE');

  if (!isOwner && !isStaff && !isFacultyWithPermission) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readStoredFile(grievance.attachmentKey);
  } catch {
    return new NextResponse('File missing on server', { status: 410 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="grievance-attachment"`,
      'Content-Length': String(buffer.length),
    },
  });
}