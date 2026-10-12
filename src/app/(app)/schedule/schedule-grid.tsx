import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

export type GridSlot = {
  id: string;
  dayOfWeek: number;
  period: number;
  subject: { name: string; code: string };
  faculty: { name: string };
  room: string | null;
};

const DAYS = [
  { num: 1, name: 'Monday' },
  { num: 2, name: 'Tuesday' },
  { num: 3, name: 'Wednesday' },
  { num: 4, name: 'Thursday' },
  { num: 5, name: 'Friday' },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function ScheduleGrid({ slots }: { slots: GridSlot[] }) {
  const byKey = new Map(slots.map((s) => [`${s.dayOfWeek}-${s.period}`, s]));

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
      <Table size="small" sx={{ minWidth: 700 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, width: 110 }}>Day</TableCell>
            {PERIODS.map((p) => (
              <TableCell key={p} align="center" sx={{ fontWeight: 700 }}>
                Period {p}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {DAYS.map((day) => (
            <TableRow key={day.num}>
              <TableCell sx={{ fontWeight: 600 }}>{day.name}</TableCell>
              {PERIODS.map((p) => {
                const slot = byKey.get(`${day.num}-${p}`);
                return (
                  <TableCell key={p} sx={{ verticalAlign: 'top', minWidth: 110 }}>
                    {slot ? (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {slot.subject.code}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {slot.subject.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {slot.faculty.name}
                        </Typography>
                        {slot.room && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {slot.room}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        —
                      </Typography>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}