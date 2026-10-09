import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function FacultyLeave({ principal }: { principal: Principal }) {
  const requests = await prisma.leaveRequest.findMany({
    where: { class: { inchargeId: principal.id } },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      student: { select: { name: true, username: true } },
      class: { select: { name: true } },
    },
  });

  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Leave requests
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Requests from students in your class
      </Typography>

      <Section title={`Needs your decision (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyCard>No pending requests. Good job keeping up.</EmptyCard>
        ) : (
          pending.map((r) => (
            <RequestCard
              key={r.id}
              id={r.id}
              studentName={r.student.name}
              className={r.class.name}
              fromDate={r.fromDate}
              toDate={r.toDate}
              body={r.body}
              status={r.status}
            />
          ))
        )}
      </Section>

      <Section title="Previously handled">
        {decided.length === 0 ? (
          <EmptyCard>No decisions yet.</EmptyCard>
        ) : (
          decided.map((r) => (
            <RequestCard
              key={r.id}
              id={r.id}
              studentName={r.student.name}
              className={r.class.name}
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

function RequestCard({
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
  if (status === 'PENDING') return <Chip label="Pending your decision" color="warning" size="small" />;
  if (status === 'PENDING_HOD') return <Chip label="Pending HOD" color="info" size="small" />;
  if (status === 'APPROVED') return <Chip label="Approved" color="success" size="small" />;
  if (status === 'REJECTED') return <Chip label="Rejected" color="error" size="small" />;
  return <Chip label={status} size="small" />;
}