import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';

export default async function StudentLeave({ principal }: { principal: Principal }) {
  const requests = await prisma.leaveRequest.findMany({
    where: { studentId: principal.id },
    orderBy: { createdAt: 'desc' },
    include: {
      class: { select: { name: true } },
      incharge: { select: { name: true } },
      hod: { select: { name: true } },
    },
  });

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            Leave requests
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Submit new requests and track their status
          </Typography>
        </Box>
        <LinkButton href="/leave/new" variant="contained" sx={{ borderRadius: 999, px: 3 }}>
          New request
        </LinkButton>
      </Stack>

      {requests.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You haven&apos;t submitted any leave requests yet.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {requests.map((r) => (
            <Paper key={r.id} sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {formatDate(r.fromDate)} → {formatDate(r.toDate)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {r.class.name} · Submitted {formatDate(r.createdAt)}
                    </Typography>
                  </Box>
                  <StatusChip status={r.status} />
                </Stack>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {r.body}
                </Typography>

                {(r.inchargeRemark || r.hodRemark) && (
                  <>
                    <Divider />
                    <Stack spacing={1}>
                      {r.inchargeRemark && (
                        <RemarkRow
                          who={r.incharge?.name ?? 'Class incharge'}
                          role="Class incharge"
                          when={r.inchargeAt}
                          remark={r.inchargeRemark}
                          isRejection={r.status === 'REJECTED' && !r.hodId}
                        />
                      )}
                      {r.hodRemark && (
                        <RemarkRow
                          who={r.hod?.name ?? 'HOD'}
                          role="HOD"
                          when={r.hodAt}
                          remark={r.hodRemark}
                          isRejection={r.status === 'REJECTED' && !!r.hodId}
                        />
                      )}
                    </Stack>
                  </>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING') return <Chip label="Pending incharge" color="default" size="small" />;
  if (status === 'PENDING_HOD') return <Chip label="Pending HOD" color="info" size="small" />;
  if (status === 'APPROVED') return <Chip label="Approved" color="success" size="small" />;
  if (status === 'REJECTED') return <Chip label="Rejected" color="error" size="small" />;
  return <Chip label={status} size="small" />;
}

function RemarkRow({
  who,
  role,
  when,
  remark,
  isRejection,
}: {
  who: string;
  role: string;
  when: Date | null;
  remark: string;
  isRejection: boolean;
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: isRejection ? 'error.main' : 'text.primary' }}>
        {role}: {who}
        {when ? ` · ${formatDate(when)}` : ''}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
        {remark}
      </Typography>
    </Box>
  );
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}