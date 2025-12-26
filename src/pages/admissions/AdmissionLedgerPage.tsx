import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdmissionById, getAdmissionLedger } from '@/services/admissionService';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
} from '@mui/material';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import AdmissionDepositDialog from '@/components/admissions/AdmissionDepositDialog';
import { formatNumber } from '@/lib/utils';

export default function AdmissionLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const admissionId = Number(id);

  const { data: admissionData, isLoading: isLoadingAdmission } = useQuery({
    queryKey: ['admission', admissionId],
    queryFn: () => getAdmissionById(admissionId).then(res => res.data),
    enabled: !!admissionId,
  });

  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['admissionLedger', admissionId],
    queryFn: () => getAdmissionLedger(admissionId),
    enabled: !!admissionId,
  });

  if (isLoadingAdmission || isLoadingLedger) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!admissionData || !ledgerData) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">حدث خطأ أثناء جلب بيانات التنويم</Typography>
        </CardContent>
      </Card>
    );
  }

  const { summary, entries } = ledgerData;
  const isAdmitted = admissionData.status === 'admitted';

  return (
    <>
      <Card className="max-w-6xl mx-auto h-full flex flex-col">
        <CardHeader
          sx={{ flexShrink: 0 }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button component={Link} to={`/admissions/${admissionId}`} startIcon={<ArrowLeft />} variant="outlined" size="small">
                رجوع
              </Button>
              <Typography variant="h5">كشف حساب المريض</Typography>
            </Box>
          }
          action={
            isAdmitted && (
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={() => setDepositDialogOpen(true)}
              >
                إضافة أمانة
              </Button>
            )
          }
        />
        <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
          {/* Summary Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                الأمانة الأولية
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {formatNumber(summary.initial_deposit)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                الأمانات الإضافية
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {formatNumber(summary.additional_deposits)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                إجمالي المدفوع من الأمانة
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {formatNumber(summary.total_paid_from_deposit)}
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

          {/* Patient Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              معلومات المريض
            </Typography>
            <Typography variant="body1">
              <strong>الاسم:</strong> {ledgerData.patient.name}
            </Typography>
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
                            label={entry.type === 'deposit' ? 'أمانة' : 'خدمة'}
                            color={entry.type === 'deposit' ? 'success' : 'primary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {entry.description}
                          {entry.count && entry.count > 1 && ` (${entry.count})`}
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
        </CardContent>
      </Card>

      {isAdmitted && (
        <AdmissionDepositDialog
          open={depositDialogOpen}
          onClose={() => setDepositDialogOpen(false)}
          admissionId={admissionId}
        />
      )}
    </>
  );
}

