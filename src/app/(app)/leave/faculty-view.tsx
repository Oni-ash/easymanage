import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function FacultyLeave({ principal }: { principal: Principal }) {
  const [ownRequests, incomingRequests] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { requesterId: principal.id },
      orderBy: { createdAt: 'desc' },
      include: {
        hod: { select: { name: true } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { class: { inchargeId: principal.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { name: true, username: true } },
        class: { select: { name: true } },
      },
    }),
  ]);

  const incomingPending = incomingRequests.filter((r) => r.status === 'PENDING');
  const incomingDecided = incomingRequests.filter((r) => r.status !== 'PENDING');

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
            Leave
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Your own requests and student requests from your class
          </Typography>
        </Box>
        <LinkButton href="/leave/new" variant="contained" sx={{ borderRadius: 999, px: 3 }}>
          Request leave
        </LinkButton>
      </Stack>

      {/* ── My own leave requests ─────────────────────────── */}
      <Section title={`My leave requests (${ownRequests.length})`}>
        {ownRequests.length === 0 ? (
          <EmptyCard>You haven&apos;t submitted any leave requests yet.</EmptyCard>
        ) : (
          ownRequests.map((r) => (
            <OwnRequestCard
              key={r.id}
              id={r.id}
              fromDate={r.fromDate}
              toDate={r.toDate}
              body={r.body}
              status={r.status}
              hodName={r.hod?.name ?? null}
              hodRemark={r.hodRemark}
              hodAt={r.hodAt}
            />
          ))
        )}
      </Section>

      {/* ── Incoming student requests ─────────────────────── */}
      <Section title={`Students awaiting your decision (${incomingPending.length})`}>
        {incomingPending.length === 0 ? (
          <EmptyCard>No pending student requests.</EmptyCard>
        ) : (
          incomingPending.map((r) => (
            <IncomingRequestCard
              key={r.id}
              id={r.id}
              studentName={r.requester.name}
              className={r.class?.name ?? ''}
              fromDate={r.fromDate}
              toDate={r.toDate}
              body={r.body}
              status={r.status}
            />
          ))
        )}
      </Section>

      <Section title="Student requests you have handled">
        {incomingDecided.length === 0 ? (
          <EmptyCard>No decisions yet.</EmptyCard>
        ) : (
          incomingDecided.map((r) => (
            <IncomingRequestCard
              key={r.id}
              id={r.id}
              studentName={r.requester.name}
              className={r.class?.name ?? ''}
              fromDate={r.fromDate}
              toDate={r.toDate}
              body={r.body}
              status={r.status}
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

function OwnRequestCard({
  id,
  fromDate,
  toDate,
  body,
  status,
  hodName,
  hodRemark,
  hodAt,
}: {
  id: string;
  fromDate: Date;
  toDate: Date;
  body: string;
  status: string;
  hodName: string | null;
  hodRemark: string | null;
  hodAt: Date | null;
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
          <Typography sx={{ fontWeight: 600 }}>
            {formatDate(fromDate)} → {formatDate(toDate)}
          </Typography>
          <StatusChip status={status} />
        </Stack>

        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {body}
        </Typography>

        {hodRemark && (
          <>
            <Divider />
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: status === 'REJECTED' ? 'error.main' : 'text.primary',
                }}
              >
                HOD: {hodName ?? '—'}
                {hodAt ? ` · ${formatDate(hodAt)}` : ''}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                {hodRemark}
              </Typography>
            </Box>
          </>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LinkButton
            href={`/leave/${id}`}
            size="small"
            variant="outlined"
            sx={{ borderRadius: 999 }}
          >
            View
          </LinkButton>
        </Box>
      </Stack>
    </Paper>
  );
}

function IncomingRequestCard({
  id,
  studentName,
  className,
  fromDate,
  toDate,
  body,
  status,
}: {
  id: string;
  studentName: string;
  className: string;
  fromDate: Date;
  toDate: Date;
  body: string;
  status: string;
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
            <Typography sx={{ fontWeight: 600 }}>
              {studentName} · {formatDate(fromDate)} → {formatDate(toDate)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {className}
            </Typography>
          </Box>
          <StatusChip status={status} />
        </Stack>

        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {body}
        </Typography>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LinkButton
            href={`/leave/${id}`}
            variant={status === 'PENDING' ? 'contained' : 'outlined'}
            size="small"
            sx={{ borderRadius: 999, px: 3 }}
          >
            {status === 'PENDING' ? 'Review' : 'View'}
          </LinkButton>
        </Box>
      </Stack>
    </Paper>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING') return <Chip label="Pending incharge" color="warning" size="small" />;
  if (status === 'PENDING_HOD') return <Chip label="Pending HOD" color="info" size="small" />;
  if (status === 'APPROVED') return <Chip label="Approved" color="success" size="small" />;
  if (status === 'REJECTED') return <Chip label="Rejected" color="error" size="small" />;
  return <Chip label={status} size="small" />;
}