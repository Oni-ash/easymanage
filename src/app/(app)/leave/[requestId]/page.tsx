import { notFound, redirect } from 'next/navigation';
import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { getPrincipal } from '@/lib/principal';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/dates';
import DecisionForm from './decision-form';

type Params = Promise<{ requestId: string }>;

export default async function LeaveDetailPage({ params }: { params: Params }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/login');

  const { requestId } = await params;

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      student: { select: { id: true, name: true, username: true, departmentId: true } },
      class: { select: { id: true, name: true, inchargeId: true } },
      incharge: { select: { name: true } },
      hod: { select: { name: true } },
    },
  });
  if (!request) notFound();

  // Who is viewing?
  const isOwner = request.studentId === principal.id;
  const isIncharge = request.class.inchargeId === principal.id;
  const isHod =
    (principal.role === 'HOD' || principal.role === 'ADMIN') &&
    principal.departmentId === request.student.departmentId;

  if (!isOwner && !isIncharge && !isHod) notFound();

  // What can they do right now?
  const canActAsIncharge = isIncharge && request.status === 'PENDING';
  const canActAsHod = isHod && request.status === 'PENDING_HOD';

  let mode: 'incharge' | 'hod' | null = null;
  if (canActAsIncharge) mode = 'incharge';
  else if (canActAsHod) mode = 'hod';

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Leave request
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {request.student.name} · {request.class.name}
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                Dates
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 18 }}>
                {formatDate(request.fromDate)} → {formatDate(request.toDate)}
              </Typography>
            </Box>
            <StatusChip status={request.status} />
          </Stack>

          <Divider />

          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Reason
            </Typography>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{request.body}</Typography>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Submitted {formatDateTime(request.createdAt)}
          </Typography>
        </Stack>
      </Paper>

      {(request.inchargeAt || request.hodAt) && (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Decision history
          </Typography>
          <Stack spacing={2}>
            {request.inchargeAt && (
              <DecisionRow
                role="Class incharge"
                who={request.incharge?.name ?? '—'}
                when={request.inchargeAt}
                remark={request.inchargeRemark}
                isRejection={request.status === 'REJECTED' && !request.hodId}
              />
            )}
            {request.hodAt && (
              <DecisionRow
                role="HOD"
                who={request.hod?.name ?? '—'}
                when={request.hodAt}
                remark={request.hodRemark}
                isRejection={request.status === 'REJECTED' && !!request.hodId}
              />
            )}
          </Stack>
        </Paper>
      )}

      {mode && (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {mode === 'incharge' ? 'Your decision' : 'HOD decision'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {mode === 'incharge'
              ? 'Approving forwards this request to the HOD. Rejecting ends it here.'
              : 'Approving finalizes this request. Rejecting ends it with your reason.'}
          </Typography>
          <DecisionForm requestId={request.id} mode={mode} />
        </Paper>
      )}
    </Box>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING') return <Chip label="Pending incharge" color="warning" size="small" />;
  if (status === 'PENDING_HOD') return <Chip label="Pending HOD" color="info" size="small" />;
  if (status === 'APPROVED') return <Chip label="Approved" color="success" size="small" />;
  if (status === 'REJECTED') return <Chip label="Rejected" color="error" size="small" />;
  return <Chip label={status} size="small" />;
}

function DecisionRow({
  role,
  who,
  when,
  remark,
  isRejection,
}: {
  role: string;
  who: string;
  when: Date;
  remark: string | null;
  isRejection: boolean;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: isRejection ? 'error.main' : 'text.primary' }}
      >
        {role}: {who} · {formatDateTime(when)} · {isRejection ? 'Rejected' : 'Approved'}
      </Typography>
      {remark && (
        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
          {remark}
        </Typography>
      )}
    </Box>
  );
}