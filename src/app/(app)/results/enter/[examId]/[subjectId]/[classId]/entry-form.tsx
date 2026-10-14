'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { saveMarks } from './actions';
import { computeGrade } from '@/lib/grades';

type Student = { id: string; name: string; username: string };

type Row = { theory: string; practical: string };

export default function EntryForm({
  examId,
  subjectId,
  classId,
  hasPractical,
  students,
  initial,
  readOnly = false,
}: {
  examId: string;
  subjectId: string;
  classId: string;
  hasPractical: boolean;
  students: Student[];
  initial: Record<string, Row>;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, Row>>(() => {
    const out: Record<string, Row> = {};
    for (const s of students) {
      out[s.id] = initial[s.id] ?? { theory: '', practical: '' };
    }
    return out;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const maxTheory = hasPractical ? 90 : 100;
  const maxPractical = hasPractical ? 10 : 0;

  const summary = useMemo(() => {
    let filled = 0;
    let passed = 0;
    let failed = 0;
    for (const s of students) {
      const r = rows[s.id];
      const t = r.theory === '' ? null : Number(r.theory);
      const p = r.practical === '' ? null : Number(r.practical);
      if (t != null) {
        filled++;
        const g = computeGrade(t, p, hasPractical);
        if (g.passed) passed++;
        else failed++;
      }
    }
    return { filled, passed, failed, total: students.length };
  }, [rows, students, hasPractical]);

  function update(studentId: string, field: 'theory' | 'practical', value: string) {
    setRows((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  async function handleSave() {
    setError(null);
    setOkMessage(null);

    const entries: Array<{
      studentId: string;
      theoryMarks: number | null;
      practicalMarks: number | null;
    }> = [];

    for (const s of students) {
      const r = rows[s.id];
      const theory = r.theory === '' ? null : Number(r.theory);
      const practical = r.practical === '' ? null : Number(r.practical);

      if (theory != null) {
        if (!Number.isInteger(theory) || theory < 0 || theory > maxTheory) {
          setError(`${s.name}: theory must be 0–${maxTheory}`);
          return;
        }
      }
      if (hasPractical && practical != null) {
        if (!Number.isInteger(practical) || practical < 0 || practical > maxPractical) {
          setError(`${s.name}: practical must be 0–${maxPractical}`);
          return;
        }
      }
      if (theory == null && practical == null) continue; // skip empty rows

      entries.push({
        studentId: s.id,
        theoryMarks: theory,
        practicalMarks: hasPractical ? practical : null,
      });
    }

    if (entries.length === 0) {
      setError('Enter at least one mark');
      return;
    }

    setSubmitting(true);
    const result = await saveMarks({
      examId,
      subjectId,
      classId,
      hasPractical,
      entries,
    });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setOkMessage('Marks saved.');
    router.refresh();
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={3} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Stat label="Entered" value={`${summary.filled} / ${summary.total}`} />
          <Stat label="Pass" value={String(summary.passed)} color="success.main" />
          <Stat label="Fail" value={String(summary.failed)} color="error.main" />
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Max theory {maxTheory}
            {hasPractical ? ` · Max practical ${maxPractical}` : ''}
          </Typography>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell align="center">Theory / {maxTheory}</TableCell>
              {hasPractical && <TableCell align="center">Practical / {maxPractical}</TableCell>}
              <TableCell align="right">Total / Grade</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s) => {
              const r = rows[s.id];
              const t = r.theory === '' ? null : Number(r.theory);
              const p = r.practical === '' ? null : Number(r.practical);
              const g = t != null ? computeGrade(t, p, hasPractical) : null;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {s.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {s.username}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ width: 120 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={r.theory}
                      onChange={(e) => update(s.id, 'theory', e.target.value)}
                      disabled={readOnly}
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          max: maxTheory,
                          step: 1,
                          style: { textAlign: 'center' },
                        },
                      }}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  {hasPractical && (
                    <TableCell align="center" sx={{ width: 120 }}>
                      <TextField
                        type="number"
                        size="small"
                        value={r.practical}
                        onChange={(e) => update(s.id, 'practical', e.target.value)}
                        disabled={readOnly}
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            max: maxPractical,
                            step: 1,
                            style: { textAlign: 'center' },
                          },
                        }}
                        sx={{ width: 90 }}
                      />
                    </TableCell>
                  )}
                  <TableCell align="right">
                    {g ? (
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: g.passed ? 'success.main' : 'error.main',
                        }}
                      >
                        {g.total} · {g.grade}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {okMessage && <Alert severity="success">{okMessage}</Alert>}

      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
        <Button onClick={() => router.push('/results')} disabled={submitting}>
          Back
        </Button>
        {!readOnly && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={submitting}
            sx={{ borderRadius: 999, px: 4 }}
          >
            {submitting ? 'Saving…' : 'Save marks'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, color }}>{value}</Typography>
    </Box>
  );
}