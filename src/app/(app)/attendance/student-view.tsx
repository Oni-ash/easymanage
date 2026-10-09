import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { prisma } from '@/lib/db';
import type { Principal } from '@/lib/principal';

export default async function StudentAttendance({ principal }: { principal: Principal }) {
  if (!principal.classId) {
    return (
      <Box>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
          Attendance
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned to a class yet. Contact your department office.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const now = new Date();
  const jsDay = now.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1=Mon … 7=Sun
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [schedule, todayRecords, total, presentCount, lateCount] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { classId: principal.classId, dayOfWeek },
      include: {
        subject: { select: { name: true, code: true } },
        faculty: { select: { name: true } },
      },
      orderBy: { period: 'asc' },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        studentId: principal.id,
        session: { date: { gte: todayStart } },
      },
      include: {
        session: { select: { subjectId: true, period: true } },
      },
    }),
    prisma.attendanceRecord.count({ where: { studentId: principal.id } }),
    prisma.attendanceRecord.count({ where: { studentId: principal.id, status: 'PRESENT' } }),
    prisma.attendanceRecord.count({ where: { studentId: principal.id, status: 'LATE' } }),
  ]);

  const recordByKey = new Map(
    todayRecords.map((r) => [`${r.session.subjectId}-${r.session.period}`, r.status]),
  );

  // "Present" for percentage purposes = PRESENT + LATE
  const attended = presentCount + lateCount;
  const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);
  const absentCount = total - attended;
  const healthy = percentage >= 75;

  return (
    <Box>
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
        Attendance
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 4, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={4}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Semester attendance
            </Typography>
            <Typography
              variant="h3"
              sx={{ fontWeight: 700, lineHeight: 1 }}
              color={healthy ? 'primary' : 'error'}
            >
              {percentage}%
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {healthy ? 'Above the 75% cutoff' : 'Below the 75% cutoff'}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          <Stack spacing={0.5}>
            <Typography variant="body2">
              <strong>{total}</strong> total sessions
            </Typography>
            <Typography variant="body2">
              <strong>{presentCount}</strong> present · <strong>{lateCount}</strong> late ·{' '}
              <strong>{absentCount}</strong> absent
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Today
      </Typography>

      {schedule.length === 0 ? (
        <Paper sx={{ p: 3, borderRadius: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>No classes scheduled today.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {schedule.map((slot) => {
            const status = recordByKey.get(`${slot.subjectId}-${slot.period}`);
            return (
              <Paper key={slot.id} sx={{ p: 2, borderRadius: 3 }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      Period {slot.period} · {slot.subject.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {slot.faculty.name}
                      {slot.room ? ` · Room ${slot.room}` : ''}
                    </Typography>
                  </Box>
                  <StatusChip status={status} />
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

function StatusChip({ status }: { status?: string }) {
  if (!status) return <Chip label="Not marked" size="small" variant="outlined" />;
  if (status === 'PRESENT') return <Chip label="Present" color="success" size="small" />;
  if (status === 'ABSENT') return <Chip label="Absent" color="error" size="small" />;
  if (status === 'LATE') return <Chip label="Late" color="warning" size="small" />;
  return <Chip label={status} size="small" />;
}