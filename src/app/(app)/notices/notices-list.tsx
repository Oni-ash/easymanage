import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function NoticesList({ principal }: { principal: Principal }) {
  const where = buildVisibilityFilter(principal);

  const notices = await prisma.notice.findMany({
    where,
    orderBy: [{ important: 'desc' }, { createdAt: 'desc' }],
    include: {
      author: { select: { name: true, role: true } },
      department: { select: { code: true } },
      class: { select: { name: true } },
    },
  });

  const canPost = principal.role !== 'STUDENT';

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            Notices
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {canPost ? 'Post and manage notices' : 'Announcements for you'}
          </Typography>
        </Box>
        {canPost && (
          <LinkButton
            href="/notices/new"
            variant="contained"
            sx={{ borderRadius: 999, px: 3 }}
          >
            New notice
          </LinkButton>
        )}
      </Stack>

      {notices.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>No notices yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {notices.map((n) => (
            <Paper
              key={n.id}
              sx={{
                p: 2.5,
                borderRadius: 3,
                borderLeft: n.important ? 4 : 0,
                borderColor: 'warning.main',
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    {n.important && <Chip label="Important" color="warning" size="small" />}
                    <ScopeChip
                      scope={n.scope}
                      departmentCode={n.department?.code ?? null}
                      className={n.class?.name ?? null}
                      semester={n.semester}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDate(n.createdAt)}
                  </Typography>
                </Stack>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {n.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {n.body}
                  </Typography>
                </Box>

                <Divider />

                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    By {n.author.name}
                  </Typography>
                  <LinkButton
                    href={`/notices/${n.id}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 999 }}
                  >
                    Read
                  </LinkButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function buildVisibilityFilter(p: Principal) {
  const ors: object[] = [{ scope: 'COLLEGE' }];

  if (p.departmentId) {
    ors.push({ scope: 'DEPARTMENT', departmentId: p.departmentId });
    if (p.role === 'STUDENT' && p.class) {
      ors.push({ scope: 'SEMESTER', departmentId: p.departmentId, semester: p.class.semester });
    }
  }
  if (p.classId) {
    ors.push({ scope: 'CLASS', classId: p.classId });
  }

  if (p.role !== 'STUDENT') {
    ors.push({ authorId: p.id });
  }

  if ((p.role === 'HOD' || p.role === 'ADMIN') && p.departmentId) {
    ors.push({ departmentId: p.departmentId });
  }

  return { OR: ors };
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