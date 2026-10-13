import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import LinkButton from './link-button';
import { formatDate, formatDateTime } from '@/lib/dates';

export default async function StudentAppointments({ principal }: { principal: Principal }) {
  const [requests, bookableStaff] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where: { studentId: principal.id },
      orderBy: { createdAt: 'desc' },
      include: {
        staff: { select: { name: true, role: true } },
        slot: { select: { startAt: true, endAt: true, location: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ['HOD', 'FACULTY'] },
        active: true,
        departmentId: principal.departmentId ?? undefined,
        availabilitySlots: { some: { isBooked: false } },
      },
      orderBy: { role: 'asc' },
      select: {
        id: true,
        name: true,
        role: true,
        _count: {
          select: {
            availabilitySlots: { where: { isBooked: false } },
          },
        },
      },
    }),
  ]);

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Appointments
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Request a meeting with your HOD or faculty
      </Typography>

      {bookableStaff.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Available to meet
          </Typography>
          <Stack spacing={1.5}>
            {bookableStaff.map((s) => (
              <Paper key={s.id} sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{s.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {s.role} · {s._count.availabilitySlots} free slot
                      {s._count.availabilitySlots === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                  <LinkButton
                    href={`/appointments/book/${s.id}`}
                    variant="contained"
                    sx={{ borderRadius: 999, px: 3 }}
                  >
                    Book
                  </LinkButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        My requests
      </Typography>

      {requests.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You haven&apos;t requested any appointments yet.
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
                  sx={{
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      With {r.staff.name} · {r.staff.role}
                    </Typography>
                    {r.slot && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatDateTime(r.slot.startAt)}
                        {r.slot.location ? ` · ${r.slot.location}` : ''}
                      </Typography>
                    )}
                  </Box>
                  <StatusChip status={r.status} />
                </Stack>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {r.reason}
                </Typography>

                {r.rejectionReason && (
                  <>
                    <Divider />
                    <Typography variant="body2" sx={{ color: 'error.main' }}>
                      Rejected: {r.rejectionReason}
                    </Typography>
                  </>
                )}

                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Requested {formatDate(r.createdAt)}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'PENDING')
    return <Chip label="Pending" color="warning" size="small" />;
  if (status === 'APPROVED' || status === 'SCHEDULED')
    return <Chip label="Scheduled" color="success" size="small" />;
  if (status === 'REJECTED')
    return <Chip label="Rejected" color="error" size="small" />;
  return <Chip label={status} size="small" />;
}