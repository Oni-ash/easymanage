import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';
import { formatDateTime } from '@/lib/dates';
import DecisionPanel from './decision-panel';
import SlotManager from './slot-manager';

export default async function StaffAppointments({ principal }: { principal: Principal }) {
  const [requests, slots] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where: { staffId: principal.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        student: { select: { name: true, username: true } },
        slot: { select: { startAt: true, endAt: true, location: true } },
      },
    }),
    prisma.availabilitySlot.findMany({
      where: { staffId: principal.id, startAt: { gt: new Date() } },
      orderBy: { startAt: 'asc' },
      include: {
        appointment: {
          select: {
            id: true,
            status: true,
            student: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const pending = requests.filter((r) => r.status === 'PENDING');
  const upcoming = requests.filter((r) => r.status === 'APPROVED' || r.status === 'SCHEDULED');
  const past = requests.filter((r) => r.status === 'REJECTED');

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
        Appointments
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Manage your availability and respond to student requests
      </Typography>

      {/* Incoming requests */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Incoming requests ({pending.length})
      </Typography>
      {pending.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4, mb: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            No pending requests.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          {pending.map((r) => (
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
                    <Typography sx={{ fontWeight: 600 }}>{r.student.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {r.student.username}
                    </Typography>
                  </Box>
                  {r.slot && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatDateTime(r.slot.startAt)}
                      {r.slot.location ? ` · ${r.slot.location}` : ''}
                    </Typography>
                  )}
                </Stack>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {r.reason}
                </Typography>

                <Divider />

                <DecisionPanel requestId={r.id} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Scheduled
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 4 }}>
            {upcoming.map((r) => (
              <Paper key={r.id} sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 600 }}>{r.student.name}</Typography>
                    <Chip label="Scheduled" color="success" size="small" />
                  </Stack>
                  {r.slot && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatDateTime(r.slot.startAt)}
                      {r.slot.location ? ` · ${r.slot.location}` : ''}
                    </Typography>
                  )}
                  <Typography variant="body2">{r.reason}</Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* Past (rejected) */}
      {past.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Rejected
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 4 }}>
            {past.map((r) => (
              <Paper key={r.id} sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 600 }}>{r.student.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'error.main' }}>
                    Rejected: {r.rejectionReason}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* Slots */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Your availability
        </Typography>
        <SlotManager
          slots={slots.map((s) => ({
            id: s.id,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
            location: s.location,
            isBooked: s.isBooked,
            bookedByName: s.appointment?.student.name ?? null,
          }))}
        />
      </Box>
    </Box>
  );
}