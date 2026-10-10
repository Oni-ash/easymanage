import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { readStoredFile } from '@/lib/storage';

type Params = Promise<{ materialId: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 });

  const { materialId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id, active: true },
    include: { inchargeOf: { select: { id: true } } },
  });
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: {
      class: { select: { id: true, departmentId: true } },
      subject: { select: { departmentId: true } },
    },
  });
  if (!material) return new NextResponse('Not found', { status: 404 });

  let allowed = false;
  if (user.role === 'STUDENT') {
    allowed = user.classId === material.classId;
  } else if (user.role === 'HOD' || user.role === 'ADMIN') {
    allowed = user.departmentId === material.class.departmentId;
  } else if (user.role === 'FACULTY') {
    if (material.uploadedById === user.id) allowed = true;
    else {
      const teaches = await prisma.teachingAssignment.findFirst({
        where: { facultyId: user.id, subjectId: material.subjectId, classId: material.classId },
      });
      if (teaches) allowed = true;
      else if (user.inchargeOf.some((c) => c.id === material.classId)) allowed = true;
    }
  }
  if (!allowed) return new NextResponse('Forbidden', { status: 403 });

  let buffer: Buffer;
  try {
    buffer = await readStoredFile(material.fileKey);
  } catch {
    return new NextResponse('File missing on server', { status: 410 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(material.fileName)}"`,
      'Content-Length': String(buffer.length),
    },
  });
}