import { useQuery } from '@tanstack/react-query';
import { getAdmissionLedger } from '@/services/admissionService';
import {
  Box,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import AdmissionDepositDialog from '@/components/admissions/AdmissionDepositDialog';
import { formatNumber } from '@/lib/utils';

interface AdmissionLedgerTabProps {
  admissionId: number;
}

export default function AdmissionLedgerTab({ admissionId }: AdmissionLedgerTabProps) {
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);

  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['admissionLedger', admissionId],
    queryFn: () => getAdmissionLedger(admissionId),
    enabled: !!admissionId,
  });

  if (isLoadingLedger) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ledgerData) {
    return (
      <Box>
        <Typography color="error">حدث خطأ أثناء جلب بيانات كشف الحساب</Typography>
      </Box>
    );
  }

  const { summary, entries } = ledgerData;

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Action Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setDepositDialogOpen(true)}
          >
            إضافة دفعة
          </Button>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              إجمالي الدفعات (Credits)
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {formatNumber(summary.total_credits)}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              إجمالي الخصومات (Debits)
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {formatNumber(summary.total_debits)}
            </Typography>
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              الرصيد الحالي
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {formatNumber(summary.balance)}
            </Typography>
          </Paper>
        </Box>

        {/* Ledger Table */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            سجل المعاملات
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الوقت</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الوصف</TableCell>
                  <TableCell align="right">المبلغ</TableCell>
                  <TableCell align="center">طريقة الدفع</TableCell>
                  <TableCell align="right">الرصيد بعد</TableCell>
                  <TableCell>المستخدم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        لا توجد معاملات مسجلة
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, index) => (
                    <TableRow key={`${entry.id}-${index}`}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.time || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={entry.type === 'credit' ? 'دفعة' : 'خصم'}
                          color={entry.type === 'credit' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {entry.description}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                          }}
                        >
                          {entry.amount >= 0 ? '+' : ''}
                          {formatNumber(entry.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {entry.is_bank ? (
                          <Chip label="بنك" color="primary" size="small" />
                        ) : (
                          <Chip label="نقدي" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                          }}
                        >
                          {formatNumber(entry.balance_after)}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.user || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      <AdmissionDepositDialog
        open={depositDialogOpen}
        onClose={() => setDepositDialogOpen(false)}
        admissionId={admissionId}
      />
    </>
  );
}

