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
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Alert,
} from '@mui/material';
import { 
  Plus, 
  Calculator, 
  Trash2, 
  HelpCircle, 
  Calendar, 
  TrendingUp, 
  Minus, 
  Receipt, 
  Wallet,
  Info,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AdmissionDepositDialog from '@/components/admissions/AdmissionDepositDialog';
import AdmissionDiscountDialog from '@/components/admissions/AdmissionDiscountDialog';
import AdmissionChargeDialog from '@/components/admissions/AdmissionChargeDialog';
import { formatNumber } from '@/lib/utils';
import type { AdmissionTransactionFormData } from '@/types/admissions';

interface AdmissionLedgerTabProps {
  admissionId: number;
}

export default function AdmissionLedgerTab({ admissionId }: AdmissionLedgerTabProps) {
  const queryClient = useQueryClient();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [daysCalculationDialogOpen, setDaysCalculationDialogOpen] = useState(false);
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
        reference_type: 'room_charges',
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
  const daysAdmitted = admissionData?.days_admitted || 0;
  const roomPricePerDay = admissionData?.room?.price_per_day || 0;
  const admissionDate = admissionData?.admission_date;
  const admissionTime = admissionData?.admission_time;
  const dischargeDate = admissionData?.discharge_date;
  const dischargeTime = admissionData?.discharge_time;

  // Determine balance status
  const balanceStatus = summary.balance > 0 ? 'due' : summary.balance < 0 ? 'credit' : 'balanced';
  
  // Helper function to get transaction type label and color
  const getTransactionTypeInfo = (entry: any) => {
    if (entry.type === 'credit') {
      return { label: 'دفعة', color: 'success' as const };
    }
    
    // For debit transactions, check reference_type
    switch (entry.reference_type) {
      case 'room_charges':
        return { label: 'رسوم إقامة', color: 'primary' as const };
      case 'service':
        return { label: 'خدمات', color: 'warning' as const };
      case 'lab_test':
        return { label: 'فحوصات', color: 'secondary' as const };
      case 'charge':
        return { label: 'رسوم', color: 'error' as const };
      case 'discount':
        return { label: 'خصم', color: 'default' as const };
      case 'manual':
        return { label: 'رسوم', color: 'error' as const };
      default:
        return { label: 'رسوم', color: 'error' as const };
    }
  };

  // Determine calculation period
  const getCalculationPeriod = () => {
    if (!admissionTime) return 'غير محدد';
    const hour = parseInt(admissionTime.split(':')[0]);
    if (hour >= 7 && hour < 12) {
      return 'نظام الـ 24 ساعة (الدخول الصباحي: 7:00 ص - 12:00 ظ)';
    } else if (hour >= 13 || hour < 6) {
      return 'نظام اليوم الكامل (الدخول المسائي/المتأخر: 1:00 ظ - 6:00 ص)';
    } else {
      return 'الفترة الافتراضية (6:00 ص - 7:00 ص)';
    }
  };

  const getCalculationExplanation = () => {
    if (!admissionTime) return 'لم يتم تحديد وقت الدخول';
    const hour = parseInt(admissionTime.split(':')[0]);
    if (hour >= 7 && hour < 12) {
      return 'إذا دخل المريض من 7:00 ص إلى 12:00 ظ، يومه ينتهي في نفس التوقيت من اليوم التالي (24 ساعة كاملة). مثال: دخل 9:00 ص، ينتهي 9:00 ص اليوم التالي.';
    } else if (hour >= 13 || hour < 6) {
      return 'إذا دخل المريض من 1:00 ظ إلى 6:00 ص اليوم التالي، يومه ينتهي حكماً عند 12:00 ظ من اليوم التالي. مثال: دخل 4:00 عصراً أو 3:00 فجراً، عند 12:00 ظ يُعتبر أتم يوماً كاملاً.';
    } else {
      return 'يتم احتساب المدة بالطريقة التقليدية (عدد الأيام + 1)';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(100vh - 200px)' }}>
      {/* Top Row: Info + Summary Cards + Actions */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
        {/* Left: Admission Info (Compact) */}
        <Card variant="outlined" sx={{ flex: '0 0 auto', minWidth: '300px' }}>
          <CardContent sx={{ py: 1.5, px: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={14} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    تاريخ الدخول
                  </Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                    {admissionDate} {admissionTime && `• ${admissionTime}`}
                  </Typography>
                </Box>
              </Box>
              {dischargeDate && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Calendar size={14} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      تاريخ الخروج
                    </Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                      {dischargeDate} {dischargeTime && `• ${dischargeTime}`}
                    </Typography>
                  </Box>
                </Box>
              )}
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    أيام الإقامة
                  </Typography>
                  <Tooltip title="اضغط للاطلاع على طريقة الحساب">
                    <IconButton
                      size="small"
                      onClick={() => setDaysCalculationDialogOpen(true)}
                      sx={{ p: 0.25 }}
                    >
                      <HelpCircle size={12} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="h6" fontWeight={600} color="primary.main" sx={{ fontSize: '1.1rem' }}>
                  {daysAdmitted} يوم
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  سعر اليوم
                </Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                  {roomPricePerDay > 0 ? formatNumber(roomPricePerDay) : 'غير محدد'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Center: Summary Cards (Compact) */}
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          {/* Total Charges Card */}
          <Card 
            elevation={1}
            sx={{ 
              bgcolor: '#FEF2F2',
              border: '1px solid',
              borderColor: '#FCA5A5',
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Receipt size={16} color="#DC2626" />
                <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 600, fontSize: '0.75rem' }}>
                  إجمالي المستحقات
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#DC2626', fontSize: '1.5rem' }}>
                {formatNumber(summary.total_debits)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#991B1B', fontSize: '0.65rem' }}>
                الرسوم والخدمات
              </Typography>
            </CardContent>
          </Card>

          {/* Total Payments Card */}
          <Card 
            elevation={1}
            sx={{ 
              bgcolor: '#F0FDF4',
              border: '1px solid',
              borderColor: '#86EFAC',
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Wallet size={16} color="#16A34A" />
                <Typography variant="caption" sx={{ color: '#16A34A', fontWeight: 600, fontSize: '0.75rem' }}>
                  إجمالي المدفوعات
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#16A34A', fontSize: '1.5rem' }}>
                {formatNumber(summary.total_credits)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#166534', fontSize: '0.65rem' }}>
                المبالغ المدفوعة
              </Typography>
            </CardContent>
          </Card>

          {/* Balance Card */}
          <Card 
            elevation={2}
            sx={{ 
              bgcolor: balanceStatus === 'due' ? '#FEF2F2' : balanceStatus === 'credit' ? '#F0FDF4' : '#F9FAFB',
              border: '2px solid',
              borderColor: balanceStatus === 'due' ? '#DC2626' : balanceStatus === 'credit' ? '#16A34A' : '#D1D5DB',
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                {balanceStatus === 'due' ? (
                  <AlertCircle size={16} color="#DC2626" />
                ) : balanceStatus === 'credit' ? (
                  <CheckCircle2 size={16} color="#16A34A" />
                ) : (
                  <Info size={16} color="#6B7280" />
                )}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: balanceStatus === 'due' ? '#DC2626' : balanceStatus === 'credit' ? '#16A34A' : '#6B7280',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                >
                  الرصيد المطلوب
                </Typography>
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: balanceStatus === 'due' ? '#DC2626' : balanceStatus === 'credit' ? '#16A34A' : '#6B7280',
                  fontSize: '1.5rem'
                }}
              >
                {formatNumber(Math.abs(summary.balance))}
              </Typography>
              <Chip 
                label={
                  balanceStatus === 'due' 
                    ? 'مطلوب من المريض' 
                    : balanceStatus === 'credit' 
                    ? 'رصيد دائن للمريض'
                    : 'الحساب متعادل'
                }
                size="small"
                sx={{ 
                  mt: 0.5,
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: balanceStatus === 'due' ? '#DC2626' : balanceStatus === 'credit' ? '#16A34A' : '#6B7280',
                  color: 'white',
                  fontWeight: 500,
                }} 
              />
            </CardContent>
          </Card>
        </Box>

        {/* Right: Action Buttons (Vertical) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={roomChargesMutation.isPending ? <CircularProgress size={14} /> : <Calculator size={14} />}
            onClick={handleCalculateRoomCharges}
            disabled={roomChargesMutation.isPending || !admissionData || !admissionData.room?.price_per_day}
            sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5, whiteSpace: 'nowrap' }}
          >
            حساب الرسوم
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Plus size={14} />}
            onClick={() => setChargeDialogOpen(true)}
            sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5 }}
          >
            إضافة رسوم
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<Minus size={14} />}
            onClick={() => setDiscountDialogOpen(true)}
            sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5 }}
          >
            إضافة خصم
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<Plus size={14} />}
            onClick={() => setDepositDialogOpen(true)}
            sx={{ fontSize: '0.75rem', px: 1.5, py: 0.5 }}
          >
            إضافة دفعة
          </Button>
        </Box>
      </Box>

      {/* Legend (Compact) */}
      <Alert 
        severity="info" 
        icon={<Info size={16} />}
        sx={{ 
          py: 0.5,
          bgcolor: '#EFF6FF',
          border: '1px solid #DBEAFE',
          '& .MuiAlert-icon': {
            color: '#3B82F6',
            py: 0.5,
          },
          '& .MuiAlert-message': {
            py: 0.5,
          }
        }}
      >
        <Typography variant="caption" fontWeight={600} sx={{ color: '#1E40AF', fontSize: '0.75rem' }}>
          📌 <strong>المستحقات:</strong> الرسوم والخدمات على المريض • <strong>المدفوعات:</strong> المبالغ المدفوعة • <strong>الرصيد = المستحقات - المدفوعات</strong> (موجب = مطلوب من المريض | سالب = دائن للمريض)
        </Typography>
      </Alert>

      {/* Ledger Table (Takes remaining height) */}
      <Card variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ py: 1.5, px: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, fontSize: '1rem' }}>
            سجل المعاملات
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem' }}>الوقت</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem' }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem' }}>الوصف</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem', color: '#DC2626' }}>
                    مدين
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem', color: '#16A34A' }}>
                    دائن
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem' }}>الرصيد</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem' }}>المستخدم</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, bgcolor: '#F9FAFB', py: 1, fontSize: '0.8rem' }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                      <Typography variant="caption" color="text.secondary">
                        لا توجد معاملات مسجلة
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry: any, index: number) => {
                    const typeInfo = getTransactionTypeInfo(entry);
                    return (
                      <TableRow 
                        key={`${entry.id}-${index}`}
                        sx={{
                          '&:nth-of-type(odd)': { bgcolor: '#FAFAFA' },
                          '&:hover': { bgcolor: '#F5F5F5' },
                        }}
                      >
                        <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>{entry.date}</TableCell>
                        <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>{entry.time || '-'}</TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip
                            label={typeInfo.label}
                            color={typeInfo.color}
                            size="small"
                            sx={{ fontWeight: 500, height: 20, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
                            {entry.description}
                          </Typography>
                          {entry.is_bank && entry.type === 'credit' && (
                            <Chip label="بنك" size="small" color="primary" sx={{ ml: 0.5, height: 16, fontSize: '0.65rem' }} />
                          )}
                        </TableCell>
                        {/* Debit Column */}
                        <TableCell align="right" sx={{ py: 0.75 }}>
                          {entry.type === 'debit' ? (
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: '#DC2626',
                                fontSize: '0.8rem'
                              }}
                            >
                              {formatNumber(Math.abs(entry.amount))}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
                              -
                            </Typography>
                          )}
                        </TableCell>
                        {/* Credit Column */}
                        <TableCell align="right" sx={{ py: 0.75 }}>
                          {entry.type === 'credit' ? (
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: '#16A34A',
                                fontSize: '0.8rem'
                              }}
                            >
                              {formatNumber(Math.abs(entry.amount))}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.75 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: entry.balance_after > 0 ? '#DC2626' : entry.balance_after < 0 ? '#16A34A' : '#6B7280',
                              fontSize: '0.8rem'
                            }}
                          >
                            {formatNumber(Math.abs(entry.balance_after))}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {entry.user || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.75 }}>
                          {admissionData?.status === 'admitted' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(entry)}
                              disabled={deleteTransactionMutation.isPending}
                              sx={{ p: 0.5 }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Days Calculation Explanation Dialog */}
      <Dialog
        open={daysCalculationDialogOpen}
        onClose={() => setDaysCalculationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpCircle size={24} />
            <Typography variant="h6">كيفية احتساب أيام الإقامة</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                معلومات الإقامة الحالية:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">تاريخ الدخول:</Typography>
                  <Typography variant="body2" fontWeight={500}>{admissionDate || '-'}</Typography>
                </Box>
                {admissionTime && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">وقت الدخول:</Typography>
                    <Typography variant="body2" fontWeight={500}>{admissionTime}</Typography>
                  </Box>
                )}
                {dischargeDate && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">تاريخ الخروج:</Typography>
                      <Typography variant="body2" fontWeight={500}>{dischargeDate}</Typography>
                    </Box>
                    {dischargeTime && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">وقت الخروج:</Typography>
                        <Typography variant="body2" fontWeight={500}>{dischargeTime}</Typography>
                      </Box>
                    )}
                  </>
                )}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">عدد الأيام المحسوبة:</Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">{daysAdmitted} يوم</Typography>
                </Box>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                الفترة الحالية: {getCalculationPeriod()}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {getCalculationExplanation()}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                قواعد الاحتساب:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                      نظام الـ 24 ساعة (الدخول الصباحي: 7:00 ص - 12:00 ظ)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      إذا دخل المريض في أي وقت من الساعة 7:00 صباحاً وحتى 12:00 ظهراً، فإن يومه ينتهي في نفس التوقيت من اليوم التالي (أي يُكمل 24 ساعة كاملة).
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                      مثال: دخل الساعة 9:00 صباحاً اليوم، ينتهي يومه الساعة 9:00 صباحاً غداً.
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                      نظام اليوم الكامل (الدخول المسائي/المتأخر: 1:00 ظ - 6:00 ص اليوم التالي)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      إذا دخل المريض من الساعة 1:00 ظهراً وحتى 6:00 صباحاً من اليوم التالي، فإن يومه ينتهي "حكماً" عند الساعة 12:00 ظهراً من اليوم التالي، بغض النظر عن عدد الساعات الفعلية.
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                      مثال: دخل الساعة 4:00 عصراً أو حتى 3:00 فجراً، بمجرد وصول الساعة 12:00 ظهراً يُعتبر قد أتمّ يوماً كاملاً.
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                      الفترة الافتراضية (6:00 ص - 7:00 ص)
                    </Typography>
                    <Typography variant="body2">
                      يتم احتساب المدة بالطريقة التقليدية: عدد الأيام بين تاريخ الدخول والخروج + 1 (لضمان احتساب يوم واحد على الأقل).
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {roomPricePerDay > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    حساب رسوم الإقامة:
                  </Typography>
                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">عدد الأيام:</Typography>
                      <Typography variant="body2" fontWeight={500}>{daysAdmitted} يوم</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">سعر اليوم:</Typography>
                      <Typography variant="body2" fontWeight={500}>{formatNumber(roomPricePerDay)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" fontWeight={600}>إجمالي الرسوم:</Typography>
                      <Typography variant="body1" fontWeight={700} color="primary.main">
                        {formatNumber(daysAdmitted * roomPricePerDay)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDaysCalculationDialogOpen(false)} variant="contained">
            فهمت
          </Button>
        </DialogActions>
      </Dialog>

      <AdmissionDepositDialog
        open={depositDialogOpen}
        onClose={() => setDepositDialogOpen(false)}
        admissionId={admissionId}
        balance={ledgerData?.summary?.balance}
      />

      <AdmissionChargeDialog
        open={chargeDialogOpen}
        onClose={() => setChargeDialogOpen(false)}
        admissionId={admissionId}
        balance={ledgerData?.summary?.balance}
      />

      <AdmissionDiscountDialog
        open={discountDialogOpen}
        onClose={() => setDiscountDialogOpen(false)}
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
    </Box>
  );
}
