'use server';

import { revalidatePath } from 'next/cache';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';

export async function deleteNotice(noticeId: string): Promise<{ ok: true } | { error: string }> {
  const principal = await getPrincipal();
  if (!principal) return { error: 'Not signed in' };

  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: { authorId: true, departmentId: true },
  });
  if (!notice) return { error: 'Notice not found' };

  const isAuthor = notice.authorId === principal.id;
  const isHodOfDept =
    (principal.role === 'HOD' || principal.role === 'ADMIN') &&
    principal.departmentId !== null &&
    notice.departmentId === principal.departmentId;

  if (!isAuthor && !isHodOfDept) {
    return { error: 'You do not have permission to delete this notice' };
  }

  await prisma.notice.delete({ where: { id: noticeId } });

  revalidatePath('/notices');
  return { ok: true };
}