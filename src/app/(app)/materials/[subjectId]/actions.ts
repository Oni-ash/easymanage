'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { saveFile, deleteStoredFile } from '@/lib/storage';

type Result = { ok: true } | { error: string };

const ALLOWED_TYPES = new Set(['NOTES', 'ASSIGNMENT', 'QUESTION_PAPER', 'LAB_MANUAL', 'OTHER']);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function uploadMaterial(formData: FormData): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role === 'STUDENT') return { error: 'Students cannot upload materials' };

  const subjectId = String(formData.get('subjectId') ?? '');
  const classId = String(formData.get('classId') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const type = String(formData.get('type') ?? '');
  const file = formData.get('file');

  if (!subjectId || !classId || !title) {
    return { error: 'Subject, class, and title are required' };
  }
  if (title.length < 3) return { error: 'Title is too short' };
  if (!ALLOWED_TYPES.has(type)) return { error: 'Invalid material type' };
  if (!(file instanceof File) || file.size === 0) return { error: 'Please select a file' };
  if (file.size > MAX_FILE_SIZE) return { error: 'File is larger than 20 MB' };

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { departmentId: true },
  });
  if (!subject) return { error: 'Subject not found' };

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { departmentId: true },
  });
  if (!cls) return { error: 'Class not found' };
  if (cls.departmentId !== subject.departmentId) {
    return { error: 'Class is not in the subject department' };
  }

  if (principal.role === 'HOD' || principal.role === 'ADMIN') {
    if (principal.departmentId !== cls.departmentId) {
      return { error: 'This class is not in your department' };
    }
  } else {
    const teaches = await prisma.teachingAssignment.findFirst({
      where: { facultyId: principal.id, subjectId, classId },
    });
    if (!teaches) {
      return { error: 'You do not teach this subject to this class' };
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { key, size } = await saveFile(file.name, buffer);

  try {
    await prisma.material.create({
      data: {
        subjectId,
        classId,
        uploadedById: principal.id,
        title,
        description: description || null,
        type: type as 'NOTES' | 'ASSIGNMENT' | 'QUESTION_PAPER' | 'LAB_MANUAL' | 'OTHER',
        fileKey: key,
        fileName: file.name,
        sizeBytes: size,
      },
    });
  } catch (e) {
    await deleteStoredFile(key);
    throw e;
  }

  const recipients = await prisma.user.findMany({
    where: { classId, role: 'STUDENT', active: true, id: { not: principal.id } },
    select: { id: true },
  });
  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        title: `New material: ${title}`,
        body: `Uploaded by ${principal.name}`,
        link: `/materials/${subjectId}`,
      })),
    });
  }

  revalidatePath(`/materials/${subjectId}`);
  revalidatePath('/materials');
  return { ok: true };
}

export async function deleteMaterial(materialId: string): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role === 'STUDENT') return { error: 'Students cannot delete materials' };

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, fileKey: true, uploadedById: true, subjectId: true, classId: true },
  });
  if (!material) return { error: 'Material not found' };

  const isUploader = material.uploadedById === principal.id;
  const isHod =
    (principal.role === 'HOD' || principal.role === 'ADMIN') && principal.departmentId !== null;

  if (!isUploader && !isHod) {
    return { error: 'You do not have permission to delete this material' };
  }

  if (isHod && !isUploader) {
    const cls = await prisma.class.findUnique({
      where: { id: material.classId },
      select: { departmentId: true },
    });
    if (cls?.departmentId !== principal.departmentId) {
      return { error: 'This material is not in your department' };
    }
  }

  await prisma.material.delete({ where: { id: materialId } });
  await deleteStoredFile(material.fileKey);

  revalidatePath(`/materials/${material.subjectId}`);
  revalidatePath('/materials');
  return { ok: true };
}