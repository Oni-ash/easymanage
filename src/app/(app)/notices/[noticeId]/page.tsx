import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/dates';
import DeleteNoticeButton from './delete-button';

type Params = Promise<{ noticeId: string }>;

export default async function NoticeDetailPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');

  const { noticeId } = await params;

  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    include: {
      author: { select: { id: true, name: true, role: true } },
      department: { select: { code: true, name: true } },
      class: { select: { name: true } },
    },
  });
  if (!notice) notFound();

  const canDelete =
    notice.authorId === principal.id ||
    (principal.role === 'HOD' &&
      principal.departmentId !== null &&
      notice.departmentId === principal.departmentId) ||
    principal.role === 'ADMIN';

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        {notice.important && <Chip label="Important" color="warning" size="small" />}
        <ScopeChip
          scope={notice.scope}
          departmentCode={notice.department?.code ?? null}
          className={notice.class?.name ?? null}
          semester={notice.semester}
        />
      </Stack>

      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        {notice.title}
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        By {notice.author.name} · {formatDateTime(notice.createdAt)}
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{notice.body}</Typography>
      </Paper>

      {canDelete && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <DeleteNoticeButton noticeId={notice.id} />
        </Box>
      )}
    </Box>
  );
}

function ScopeChip({
  scope,
  departmentCode,
  className,
  semester,
}: {
  scope: string;
  departmentCode: string | null;
  className: string | null;
  semester: number | null;
}) {
  let label = '';
  if (scope === 'COLLEGE') label = 'College-wide';
  else if (scope === 'DEPARTMENT') label = departmentCode ?? 'Department';
  else if (scope === 'SEMESTER') label = `Semester ${semester ?? ''} · ${departmentCode ?? ''}`;
  else if (scope === 'CLASS') label = className ?? 'Class';
  return <Chip label={label} size="small" variant="outlined" />;
}