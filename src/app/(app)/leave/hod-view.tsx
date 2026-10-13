import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function HodLeave({ principal }: { principal: Principal }) {
  if (!principal.departmentId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Leave requests
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a department.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const requests = await prisma.leaveRequest.findMany({
    where: { requester: { departmentId: principal.departmentId } },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { name: true, username: true, role: true } },
      class: { select: { name: true } },
      incharge: { select: { name: true } },
    },
  });

  const pending = requests.filter((r) => r.status === 'PENDING_HOD');
  const decided = requests.filter((r) => r.status === 'APPROVED' || (r.status === 'REJECTED' && !!r.hodId));
  const inchargeRejected = requests.filter(
    (r) => r.status === 'REJECTED' && !r.hodId && r.requester.role === 'STUDENT',
  );

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Leave requests
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.department?.name ?? 'Your department'}
      </Typography>

      <Section title={`Awaiting your approval (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyCard>Nothing waiting on you right now.</EmptyCard>
        ) : (
          pending.map((r) => (
            <RequestCard
              key={r.id}
              id={r.id}
              requesterName={r.requester.name}
              requesterRole={r.requester.role}
              className={r.class?.name ?? null}
              fromDate={r.fromDate}
              toDate={r.toDate}
              body={r.body}
              status={r.status}
              inchargeName={r.incharge?.name ?? null}
              inchargeRemark={r.inchargeRemark}
              inchargeAt={r.inchargeAt}
            />
          ))
        )}
      </Section>

      <Section title="Handled by you">
        {decided.length === 0 ? (
          <EmptyCard>No decisions yet.</EmptyCard>
        ) : (
          decided.map((r) => (
            <RequestCard
              key={r.id}
              id={r.id}
              requesterName={r.requester.name}
              requesterRole={r.requester.role}
              className={r.class?.name ?? null}
              fromDate={r.fromDate}
              toDate={r.toDate}
              body={r.body}
              status={r.status}
              inchargeName={r.incharge?.name ?? null}
              inchargeRemark={r.inchargeRemark}
              inchargeAt={r.inchargeAt}
            />
          ))
        )}
      </Section>

      <Section title="Rejected by class incharge">
        {inchargeRejected.length === 0 ? (
          <EmptyCard>None.</EmptyCard>
        ) : (
          inchargeRejected.map((r) => (
            <RequestCard
              key={r.id}
              id={r.id}
              requesterName={r.requester.name}
              requesterRole={r.requester.role}
              className={r.class?.name ?? null}
              fromDate={r.fromDate}
              toDate={r.toDate}
              body={r.body}
              status={r.status}
              inchargeName={r.incharge?.name ?? null}
              inchargeRemark={r.inchargeRemark}
              inchargeAt={r.inchargeAt}
            />
          ))
        )}
      </Section>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
      <Typography sx={{ color: 'text.secondary' }}>{children}</Typography>
    </Paper>
  );
}

function RequestCard({
  id,
  requesterName,
  requesterRole,
  className,
  fromDate,
  toDate,
  body,
  status,
  inchargeName,
  inchargeRemark,
  inchargeAt,
}: {
  id: string;
  requesterName: string;
  requesterRole: string;
  className: string | null;
  fromDate: Date;
  toDate: Date;
  body: string;
  status: string;
  inchargeName: string | null;
  inchargeRemark: string | null;
  inchargeAt: Date | null;
}) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600 }}>
                {requesterName} · {formatDate(fromDate)} → {formatDate(toDate)}
              </Typography>
              {requesterRole !== 'STUDENT' && (
                <Chip label={requesterRole} size="small" color="primary" variant="outlined" />
              )}
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {className ?? 'Faculty request'}
            </Typography>
          </Box>
          <StatusChip status={status} />
        </Stack>

        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {body}
        </Typography>

        {inchargeName && inchargeRemark && (
          <>
            <Divider />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Class incharge: {inchargeName}
                {inchargeAt ? ` · ${formatDate(inchargeAt)}` : ''}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                {inchargeRemark}
              </Typography>
            </Box>
          </>
        )}

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LinkButton
            href={`/leave/${id}`}
            variant={status === 'PENDING_HOD' ? 'contained' : 'outlined'}
            size="small"
            sx={{ borderRadius: 999, px: 3 }}
          >
            {status === 'PENDING_HOD' ? 'Review' : 'View'}
          </LinkButton>
        </Box>
      </Stack>
    </Paper>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING') return <Chip label="With incharge" color="default" size="small" />;
  if (status === 'PENDING_HOD') return <Chip label="Awaiting your approval" color="warning" size="small" />;
  if (status === 'APPROVED') return <Chip label="Approved" color="success" size="small" />;
  if (status === 'REJECTED') return <Chip label="Rejected" color="error" size="small" />;
  return <Chip label={status} size="small" />;
}