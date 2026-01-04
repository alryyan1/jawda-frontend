import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdmissionLedger, getAdmissionById, addAdmissionTransaction, deleteAdmissionTransaction } from '@/services/admissionService';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Plus, Calculator, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AdmissionDepositDialog from '@/components/admissions/AdmissionDepositDialog';
import { formatNumber } from '@/lib/utils';
import type { AdmissionTransactionFormData } from '@/types/admissions';

interface AdmissionLedgerTabProps {
  admissionId: number;
}

export default function AdmissionLedgerTab({ admissionId }: AdmissionLedgerTabProps) {
  const queryClient = useQueryClient();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: number | string; description: string } | null>(null);

  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['admissionLedger', admissionId],
    queryFn: () => getAdmissionLedger(admissionId),
    enabled: !!admissionId,
  });

  const { data: admissionData } = useQuery({
    queryKey: ['admission', admissionId],
    queryFn: () => getAdmissionById(admissionId).then(res => res.data),
    enabled: !!admissionId,
  });

  const calculateRoomCharges = () => {
    if (!admissionData) return null;

    const days = admissionData.days_admitted || 0;
    const pricePerDay = admissionData.room?.price_per_day || 0;

    if (days === 0) {
      toast.error('عدد أيام الإقامة صفر');
      return null;
    }

    if (pricePerDay === 0) {
      toast.error('لم يتم تحديد سعر اليوم للغرفة');
      return null;
    }

    return days * pricePerDay;
  };

  const roomChargesMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = calculateRoomCharges();
      if (!totalAmount) {
        throw new Error('لا يمكن حساب رسوم الإقامة');
      }

      const days = admissionData!.days_admitted || 0;
      const transactionData: AdmissionTransactionFormData = {
        type: 'debit',
        amount: totalAmount,
        description: `رسوم الإقامة - ${days} يوم`,
        reference_type: 'manual',
        is_bank: false,
        notes: 'حساب تلقائي لرسوم الإقامة',
      };

      return addAdmissionTransaction(admissionId, transactionData);
    },
    onSuccess: () => {
      toast.success('تم حساب وإضافة رسوم الإقامة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionLedger', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionTransactions', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionBalance', admissionId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حساب رسوم الإقامة');
    },
  });

  const handleCalculateRoomCharges = () => {
    if (!admissionData) {
      toast.error('لم يتم تحميل بيانات التنويم');
      return;
    }

    if (admissionData.status !== 'admitted' && admissionData.status !== 'discharged') {
      toast.error('لا يمكن حساب رسوم الإقامة للتنويم الحالي');
      return;
    }

    roomChargesMutation.mutate();
  };

  const deleteTransactionMutation = useMutation({
    mutationFn: (transactionId: number | string) => deleteAdmissionTransaction(admissionId, Number(transactionId)),
    onSuccess: () => {
      toast.success('تم حذف المعاملة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionLedger', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionTransactions', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionBalance', admissionId] });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حذف المعاملة');
    },
  });

  const handleDeleteClick = (entry: { id: number | string; description: string }) => {
    setTransactionToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      deleteTransactionMutation.mutate(transactionToDelete.id);
    }
  };

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
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={roomChargesMutation.isPending ? <CircularProgress size={16} /> : <Calculator size={16} />}
            onClick={handleCalculateRoomCharges}
            disabled={roomChargesMutation.isPending || !admissionData || !admissionData.room?.price_per_day}
          >
            حساب رسوم الإقامة
          </Button>
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
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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
                        {entry.type === 'debit' && (entry.reference_type === 'service' || entry.reference_type === 'lab_test') ? (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        ) : entry.is_bank ? (
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
                      <TableCell align="center">
                        {admissionData?.status === 'admitted' && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(entry)}
                            disabled={deleteTransactionMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                      </TableCell>
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
        balance={ledgerData?.summary?.balance}
      />

      {/* Delete Transaction Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTransactionToDelete(null);
        }}
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <DialogContentText>
            هل أنت متأكد من حذف المعاملة التالية؟
            <br />
            <strong>{transactionToDelete?.description}</strong>
            <br />
            <br />
            لا يمكن التراجع عن هذا الإجراء.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setTransactionToDelete(null);
            }}
            disabled={deleteTransactionMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteTransactionMutation.isPending}
          >
            {deleteTransactionMutation.isPending ? <CircularProgress size={20} /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

