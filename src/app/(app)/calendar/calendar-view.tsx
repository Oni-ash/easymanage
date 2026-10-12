'use client';

import { useMemo, useState } from 'react';
import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export type CalEvent = {
  id: string;
  title: string;
  details: string | null;
  scope: string;
  startAt: string;
  endAt: string | null;
  departmentCode: string | null;
  className: string | null;
  semester: number | null;
  createdByName: string;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date) {
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function buildGrid(monthStart: Date): Date[] {
  const start = new Date(monthStart);
  const dayOfWeek = (start.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  start.setDate(start.getDate() - dayOfWeek);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function CalendarView({ events }: { events: CalEvent[] }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const key = dateKey(new Date(e.startAt));
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildGrid(monthCursor), [monthCursor]);
  const currentMonthKey = monthCursor.getMonth();
  const currentYear = monthCursor.getFullYear();

  const monthEvents = useMemo(
    () =>
      events
        .filter((e) => {
          const d = new Date(e.startAt);
          return d.getMonth() === currentMonthKey && d.getFullYear() === currentYear;
        })
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [events, currentMonthKey, currentYear],
  );

  function prevMonth() {
    setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setSelectedKey(null);
  }
  function nextMonth() {
    setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setSelectedKey(null);
  }
  function goToday() {
    const n = new Date();
    setMonthCursor(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelectedKey(dateKey(n));
  }

  const selectedEvents = selectedKey ? eventsByDay.get(selectedKey) ?? [] : [];
  const displayList = selectedKey ? selectedEvents : monthEvents;

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton onClick={prevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 220, textAlign: 'center' }}>
            {monthLabel(monthCursor)}
          </Typography>
          <IconButton onClick={nextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
        <Button onClick={goToday} variant="outlined" sx={{ borderRadius: 999, px: 3 }}>
          Today
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 2,
        }}
      >
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
              mb: 1,
            }}
          >
            {DAY_LABELS.map((d) => (
              <Box
                key={d}
                sx={{
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  color: 'text.secondary',
                }}
              >
                {d}
              </Box>
            ))}
          </Box>
          <Box
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}
          >
            {cells.map((d) => {
              const key = dateKey(d);
              const inMonth =
                d.getMonth() === currentMonthKey && d.getFullYear() === currentYear;
              const dayEvents = eventsByDay.get(key) ?? [];
              const isSelected = key === selectedKey;
              const isToday = key === dateKey(new Date());
              return (
                <Button
                  key={key}
                  onClick={() => setSelectedKey(isSelected ? null : key)}
                  sx={{
                    aspectRatio: '1',
                    minWidth: 0,
                    p: 0.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: isSelected
                      ? 'primary.main'
                      : isToday
                        ? 'primary.light'
                        : 'divider',
                    bgcolor: isSelected
                      ? 'action.selected'
                      : inMonth
                        ? 'background.paper'
                        : 'action.hover',
                    color: inMonth ? 'text.primary' : 'text.disabled',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: isToday ? 700 : 500,
                      lineHeight: 1.2,
                    }}
                  >
                    {d.getDate()}
                  </Typography>
                  {dayEvents.length > 0 && (
                    <Stack direction="row" spacing={0.25} sx={{ mt: 0.5 }}>
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>
                          +
                        </Typography>
                      )}
                    </Stack>
                  )}
                </Button>
              );
            })}
          </Box>
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3, minHeight: 300 }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {selectedKey ? `Events on ${selectedKey}` : `Events in ${monthLabel(monthCursor)}`}
            </Typography>
            {selectedKey && (
              <Button size="small" onClick={() => setSelectedKey(null)}>
                Clear
              </Button>
            )}
          </Stack>

          {displayList.length === 0 ? (
            <Typography sx={{ color: 'text.secondary' }}>
              {selectedKey ? 'No events on this day.' : 'No events this month.'}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {displayList.map((e) => (
                <Paper key={e.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontWeight: 600 }}>{e.title}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {new Date(e.startAt).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' · '}
                      <ScopeLabel event={e} />
                    </Typography>
                    {e.details && (
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}
                      >
                        {e.details}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

function ScopeLabel({ event }: { event: CalEvent }) {
  if (event.scope === 'COLLEGE') return <>College-wide</>;
  if (event.scope === 'DEPARTMENT') return <>Department · {event.departmentCode}</>;
  if (event.scope === 'SEMESTER')
    return <>Semester {event.semester} · {event.departmentCode}</>;
  if (event.scope === 'CLASS') return <>{event.className}</>;
  return <>{event.scope}</>;
}