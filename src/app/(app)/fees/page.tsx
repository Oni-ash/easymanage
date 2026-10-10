
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

type Transaction = {
  id: string;
  amount: string | number;
  paidAt: string;
  note?: string | null;
  receiptNumber?: string | null;
  utr?: string | null;
};

type FeeRecord = {
  id: string;
  totalAmount: string | number;
  dueDate: string;
  transactions: Transaction[];
};

type Student = {
  id: string;
  name: string;
  username: string;
  feeRecord: FeeRecord | null;
};

type FeeResponse = {
  fee?: FeeRecord | null;
  students?: Student[];
  canRecordPayments?: boolean;
  error?: string;
};

type PaymentResponse = {
  error?: string;
  transaction?: Transaction;
};

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

function getPaid(fee: FeeRecord) {
  return fee.transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
}

function getPending(fee: FeeRecord) {
  return Math.max(0, Number(fee.totalAmount) - getPaid(fee));
}

function FeeSummary({ fee }: { fee: FeeRecord }) {
  const total = Number(fee.totalAmount);
  const paid = getPaid(fee);
  const pending = getPending(fee);

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Total Fees</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {money(total)}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Paid</Typography>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: 'success.main' }}
        >
          {money(paid)}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Pending</Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: pending > 0 ? 'error.main' : 'success.main',
          }}
        >
          {money(pending)}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Payment History
        </Typography>

        {fee.transactions.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            No payments recorded yet.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {fee.transactions.map((transaction) => (
              <Box
                key={transaction.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>
                  {money(Number(transaction.amount))}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Date:{' '}
                  {new Date(transaction.paidAt).toLocaleDateString('en-IN')}
                </Typography>

                {transaction.receiptNumber && (
                  <Typography variant="body2">
                    Receipt Number: {transaction.receiptNumber}
                  </Typography>
                )}

                {transaction.utr && (
                  <Typography variant="body2" color="text.secondary">
                    UTR / Payment Reference: {transaction.utr}
                  </Typography>
                )}

                {transaction.note && (
                  <Typography variant="body2">
                    Note: {transaction.note}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Due Date</Typography>
        <Typography>
          {new Date(fee.dueDate).toLocaleDateString('en-IN')}
        </Typography>
      </Paper>
    </Stack>
  );
}

export default function FeesPage() {
  const [data, setData] = useState<FeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [lastReceipt, setLastReceipt] = useState<Transaction | null>(null);

  const loadFees = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/fees', {
        cache: 'no-store',
      });

      const result = (await response.json()) as FeeResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Unable to load fee details');
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load fees',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFees();
  }, [loadFees]);

  async function recordPayment() {
    const paymentAmount = Number(amount);

    if (
      !studentId ||
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      Math.round(paymentAmount * 100) !== paymentAmount * 100
    ) {
      setError(
        'Select a student and enter a valid amount with up to 2 decimals.',
      );
      return;
    }

    if (utr.trim().length > 100) {
      setError('UTR must not exceed 100 characters.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    setLastReceipt(null);

    try {
      const response = await fetch('/api/fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          amount: paymentAmount,
          utr: utr.trim(),
        }),
      });

      const result = (await response.json()) as PaymentResponse;

      if (!response.ok) {
        throw new Error(result.error || 'Unable to record payment');
      }

      if (!result.transaction) {
        throw new Error('Payment response did not include receipt details.');
      }

      setLastReceipt(result.transaction);
      setMessage('Payment record saved successfully.');
      setAmount('');
      setUtr('');

      await loadFees();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to record payment',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isStudent =
    data !== null &&
    Object.prototype.hasOwnProperty.call(data, 'fee');

  const fee = data?.fee;
  const students = data?.students ?? [];
  const canRecordPayments = data?.canRecordPayments ?? false;
  const isFaculty = !isStudent && !canRecordPayments;

  const studentsWithPendingFees = students.filter(
    (student) =>
      student.feeRecord !== null &&
      getPending(student.feeRecord) > 0,
  );

  const selectedStudent = students.find(
    (student) => student.id === studentId,
  );

  const totalPending = students.reduce(
    (sum, student) =>
      sum + (student.feeRecord ? getPending(student.feeRecord) : 0),
    0,
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Fees
          </Typography>
          <Typography color="text.secondary">
            View fee details and payment records.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {message && <Alert severity="success">{message}</Alert>}

        {lastReceipt && canRecordPayments && (
          <Paper
            id="fee-receipt"
            variant="outlined"
            sx={{ p: 3, border: '1px dashed', borderColor: 'divider' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Payment Receipt
            </Typography>

            <Typography color="text.secondary" variant="body2">
              EasyManage fee record
            </Typography>

            <Box sx={{ my: 2 }}>
              <Typography>
                Receipt Number: {lastReceipt.receiptNumber || 'Not returned'}
              </Typography>

              <Typography>
                Student: {selectedStudent?.name ?? 'Student'}
              </Typography>

              <Typography>
                Amount: {money(Number(lastReceipt.amount))}
              </Typography>

              <Typography>
                Date:{' '}
                {new Date(lastReceipt.paidAt).toLocaleDateString('en-IN')}
              </Typography>

              <Typography>
                UTR / Payment Reference: {lastReceipt.utr || 'Not provided'}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              This receipt records an entry in EasyManage. It is not independent
              confirmation that a payment was received.
            </Alert>

            <Button
              variant="outlined"
              onClick={() => window.print()}
              sx={{ '@media print': { display: 'none' } }}
            >
              Print Receipt
            </Button>
          </Paper>
        )}

        {isStudent ? (
          fee ? (
            <FeeSummary fee={fee} />
          ) : (
            <Alert severity="info">
              No fee record has been created for your account yet.
            </Alert>
          )
        ) : (
          <>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {isFaculty ? 'Class Fee Overview' : 'Department Fee Overview'}
              </Typography>

              <Typography color="text.secondary">
                {isFaculty ? 'Students in your assigned class:' : 'Students:'}{' '}
                {students.length}
              </Typography>

              <Typography color="text.secondary">
                Total Pending Fees: {money(totalPending)}
              </Typography>
            </Paper>

            {canRecordPayments && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Record Student Payment
                </Typography>

                {studentsWithPendingFees.length === 0 ? (
                  <Alert severity="info">
                    No students currently have pending fees.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Select Student"
                      value={studentId}
                      onChange={(event) => setStudentId(event.target.value)}
                      fullWidth
                    >
                      {studentsWithPendingFees.map((student) => (
                        <MenuItem key={student.id} value={student.id}>
                          {student.name} ({student.username}) — Pending{' '}
                          {money(getPending(student.feeRecord!))}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Payment Amount (₹)"
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      slotProps={{
                        htmlInput: {
                          min: 0.01,
                          step: 0.01,
                        },
                      }}
                      fullWidth
                    />

                    <TextField
                      label="UTR / Payment Reference (Optional)"
                      value={utr}
                      onChange={(event) => setUtr(event.target.value)}
                      slotProps={{
                        htmlInput: {
                          maxLength: 100,
                        },
                      }}
                      helperText="Enter the transaction reference after checking the payment."
                      fullWidth
                    />

                    <Button
                      variant="contained"
                      disabled={
                        saving ||
                        !studentId ||
                        !amount ||
                        !Number.isFinite(Number(amount)) ||
                        Number(amount) <= 0 ||
                        Math.round(Number(amount) * 100) !== Number(amount) * 100
                      }
                      onClick={() => void recordPayment()}
                    >
                      {saving ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </Stack>
                )}
              </Paper>
            )}

            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {isFaculty ? 'Class Student Fee Records' : 'Student Fee Records'}
            </Typography>

            {students.length === 0 ? (
              <Alert severity="info">
                {isFaculty
                  ? 'No students found in your assigned class. Add or assign students to your class first.'
                  : 'No students found in your department.'}
              </Alert>
            ) : (
              students.map((student) => (
                <Paper key={student.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography sx={{ fontWeight: 700, mb: 2 }}>
                    {student.name} ({student.username})
                  </Typography>

                  {student.feeRecord ? (
                    <FeeSummary fee={student.feeRecord} />
                  ) : (
                    <Typography color="text.secondary">
                      No fee record available.
                    </Typography>
                  )}
                </Paper>
              ))
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
