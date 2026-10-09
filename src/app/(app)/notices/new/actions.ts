'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

type Result = { ok: true } | { error: string };

export async function createNotice(formData: FormData): Promise<Result> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };
  if (principal.role === 'STUDENT') return { error: 'Students cannot post notices' };
  if (!principal.departmentId) return { error: 'You are not assigned to a department' };

  const scope = String(formData.get('scope') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const important = formData.get('important') === 'on';

  if (!title || !body) return { error: 'Title and body are required' };
  if (title.length < 3) return { error: 'Title is too short' };
  if (body.length < 10) return { error: 'Body is too short' };

  const baseData = {
    authorId: principal.id,
    title,
    body,
    important,
    departmentId: principal.departmentId,
  };

  let noticeId: string;

  if (scope === 'DEPARTMENT') {
    const n = await prisma.notice.create({
      data: { ...baseData, scope: 'DEPARTMENT' },
    });
    noticeId = n.id;
  } else if (scope === 'SEMESTER') {
    const sem = Number(formData.get('semester') ?? 0);
    if (sem < 1 || sem > 8) return { error: 'Invalid semester' };
    const n = await prisma.notice.create({
      data: { ...baseData, scope: 'SEMESTER', semester: sem },
    });
    noticeId = n.id;
  } else if (scope === 'CLASS') {
    const targetClassId = principal.inchargeOf[0]?.id ?? null;
    if (!targetClassId) {
      return { error: 'You are not a class incharge of any class' };
    }
    const n = await prisma.notice.create({
      data: { ...baseData, scope: 'CLASS', classId: targetClassId },
    });
    noticeId = n.id;
  } else {
    return { error: 'Invalid audience' };
  }

  await notifyAudience(noticeId, principal);

  revalidatePath('/notices');
  return { ok: true };
}

async function notifyAudience(
  noticeId: string,
  principal: { id: string; name: string },
): Promise<void> {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { scope: true, classId: true, semester: true, departmentId: true, title: true },
  });
  if (!notice) return;

  let recipients: { id: string }[] = [];

  if (notice.scope === 'DEPARTMENT' && notice.departmentId) {
    recipients = await prisma.user.findMany({
      where: { departmentId: notice.departmentId, active: true, id: { not: principal.id } },
      select: { id: true },
    });
  } else if (notice.scope === 'SEMESTER' && notice.departmentId && notice.semester) {
    recipients = await prisma.user.findMany({
      where: {
        departmentId: notice.departmentId,
        active: true,
        id: { not: principal.id },
        OR: [
          { role: 'STUDENT', class: { semester: notice.semester } },
          { role: { in: ['FACULTY', 'HOD'] } },
        ],
      },
      select: { id: true },
    });
  } else if (notice.scope === 'CLASS' && notice.classId) {
    recipients = await prisma.user.findMany({
      where: { classId: notice.classId, active: true, id: { not: principal.id } },
      select: { id: true },
    });
  }

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      title: `New notice: ${notice.title}`,
      body: `Posted by ${principal.name}`,
      link: `/notices/${noticeId}`,
    })),
  });
}