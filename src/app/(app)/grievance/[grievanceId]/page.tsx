import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/dates';
import StaffPanel from './staff-panel';

type Params = Promise<{ grievanceId: string }>;

export default async function GrievanceDetailPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');

  const { grievanceId } = await params;

  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    include: {
      student: { select: { id: true, name: true, username: true, departmentId: true } },
      department: { select: { id: true, name: true, code: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (!grievance) notFound();

  const isOwner = grievance.studentId === principal.id;
  const canSeeAsStaff =
    principal.role === 'HOD' ||
    principal.role === 'ADMIN' ||
    (principal.role === 'FACULTY' &&
      principal.departmentId === grievance.departmentId &&
      (principal.permissions as string[]).includes('GRIEVANCE'));

  if (!isOwner && !canSeeAsStaff) notFound();

  // Staff in the same department who could be assigned
  const assignableStaff =
    principal.role === 'HOD' || principal.role === 'ADMIN'
      ? await prisma.user.findMany({
          where: {
            departmentId: grievance.departmentId,
            active: true,
            role: { in: ['FACULTY', 'HOD'] },
          },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      : [];

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Chip label={grievance.type} size="small" variant="outlined" />
        <StatusChip status={grievance.status} />
      </Stack>

      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Grievance from {grievance.student.name}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Filed {formatDateTime(grievance.createdAt)} · {grievance.department.code}
        {grievance.student.username !== principal.username
          ? ` · ${grievance.student.username}`
          : ''}
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          Details
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {grievance.details}
        </Typography>

        {grievance.attachmentKey && (
          <Box sx={{ mt: 2 }}>
            <a href={`/api/grievance/${grievance.id}/attachment`}>
              <Typography sx={{ color: 'primary.main', textDecoration: 'underline' }}>
                Download attachment
              </Typography>
            </a>
          </Box>
        )}
      </Paper>

      {grievance.assignedTo && (
        <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Currently handled by {grievance.assignedTo.name}
          </Typography>
        </Paper>
      )}

      {(grievance.response || grievance.resolvedAt) && (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 3, borderLeft: 4, borderColor: 'success.main' }}>
          <Typography variant="overline" sx={{ color: 'success.main', fontWeight: 700 }}>
            Response
          </Typography>
          {grievance.response && (
            <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {grievance.response}
            </Typography>
          )}
          {grievance.resolvedAt && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              Resolved {formatDateTime(grievance.resolvedAt)}
            </Typography>
          )}
        </Paper>
      )}

      {canSeeAsStaff && (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Staff actions
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {principal.role === 'HOD' || principal.role === 'ADMIN'
              ? 'You can assign this to any staff member in your department, update its status, and send a response.'
              : 'Update the status and send a response. The student will see the response.'}
          </Typography>
          <StaffPanel
            grievanceId={grievance.id}
            currentStatus={grievance.status}
            currentResponse={grievance.response}
            currentAssignedTo={grievance.assignedTo?.id ?? null}
            assignableStaff={assignableStaff}
            canAssign={principal.role === 'HOD' || principal.role === 'ADMIN'}
          />
        </Paper>
      )}
    </Box>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING') return <Chip label="Pending" color="warning" size="small" />;
  if (status === 'IN_PROGRESS') return <Chip label="In progress" color="info" size="small" />;
  if (status === 'RESOLVED') return <Chip label="Resolved" color="success" size="small" />;
  return <Chip label={status} size="small" />;
}