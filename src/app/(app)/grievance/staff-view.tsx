import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate } from '@/lib/dates';

export default async function StaffGrievance({ principal }: { principal: Principal }) {
  if (!principal.departmentId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Grievances
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a department.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const grievances = await prisma.grievance.findMany({
    where: { departmentId: principal.departmentId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      student: { select: { name: true, username: true } },
      assignedTo: { select: { name: true } },
    },
  });

  const pending = grievances.filter((g) => g.status === 'PENDING');
  const inProgress = grievances.filter((g) => g.status === 'IN_PROGRESS');
  const resolved = grievances.filter((g) => g.status === 'RESOLVED');

  const isHod = principal.role === 'HOD' || principal.role === 'ADMIN';

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Grievances
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {principal.department?.name ?? 'Your department'}
        {isHod ? ' · You can assign and reassign' : ''}
      </Typography>

      <Section title={`Pending (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyCard>No pending grievances.</EmptyCard>
        ) : (
          pending.map((g) => (
            <GrievanceCard
              key={g.id}
              id={g.id}
              type={g.type}
              status={g.status}
              details={g.details}
              studentName={g.student.name}
              createdAt={g.createdAt}
              assignedToName={g.assignedTo?.name ?? null}
            />
          ))
        )}
      </Section>

      <Section title={`In progress (${inProgress.length})`}>
        {inProgress.length === 0 ? (
          <EmptyCard>No grievances being handled.</EmptyCard>
        ) : (
          inProgress.map((g) => (
            <GrievanceCard
              key={g.id}
              id={g.id}
              type={g.type}
              status={g.status}
              details={g.details}
              studentName={g.student.name}
              createdAt={g.createdAt}
              assignedToName={g.assignedTo?.name ?? null}
            />
          ))
        )}
      </Section>

      <Section title={`Resolved (${resolved.length})`}>
        {resolved.length === 0 ? (
          <EmptyCard>None resolved yet.</EmptyCard>
        ) : (
          resolved.map((g) => (
            <GrievanceCard
              key={g.id}
              id={g.id}
              type={g.type}
              status={g.status}
              details={g.details}
              studentName={g.student.name}
              createdAt={g.createdAt}
              assignedToName={g.assignedTo?.name ?? null}
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

function GrievanceCard({
  id,
  type,
  status,
  details,
  studentName,
  createdAt,
  assignedToName,
}: {
  id: string;
  type: string;
  status: string;
  details: string;
  studentName: string;
  createdAt: Date;
  assignedToName: string | null;
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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={type} size="small" variant="outlined" />
            <StatusChip status={status} />
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDate(createdAt)}
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {details}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          From {studentName}
          {assignedToName ? ` · Handling: ${assignedToName}` : ' · Unassigned'}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LinkButton
            href={`/grievance/${id}`}
            size="small"
            variant={status === 'RESOLVED' ? 'outlined' : 'contained'}
            sx={{ borderRadius: 999 }}
          >
            Open
          </LinkButton>
        </Box>
      </Stack>
    </Paper>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING') return <Chip label="Pending" color="warning" size="small" />;
  if (status === 'IN_PROGRESS') return <Chip label="In progress" color="info" size="small" />;
  if (status === 'RESOLVED') return <Chip label="Resolved" color="success" size="small" />;
  return <Chip label={status} size="small" />;
}