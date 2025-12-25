import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Plus, Trash2, Edit } from 'lucide-react';
import type { AdmissionRequestedService, AdmissionServiceDepositFormData } from '@/types/admissions';
import {
  getAdmissionServiceDeposits,
  addAdmissionServiceDeposit,
  updateAdmissionServiceDeposit,
  deleteAdmissionServiceDeposit,
} from '@/services/admissionServiceService';

interface AdmissionServiceDepositsDialogProps {
  open: boolean;
  onClose: () => void;
  service: AdmissionRequestedService;
}

export default function AdmissionServiceDepositsDialog({
  open,
  onClose,
  service,
}: AdmissionServiceDepositsDialogProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDepositId, setEditDepositId] = useState<number | null>(null);

  const { data: deposits, isLoading } = useQuery({
    queryKey: ['admissionServiceDeposits', service.id],
    queryFn: () => getAdmissionServiceDeposits(service.id),
    enabled: open,
  });

  const form = useForm<AdmissionServiceDepositFormData>({
    defaultValues: {
      amount: 0,
      is_bank: false,
      notes: '',
    },
  });

  const { control, handleSubmit, reset } = form;

  const addMutation = useMutation({
    mutationFn: (data: AdmissionServiceDepositFormData) =>
      addAdmissionServiceDeposit(service.id, data),
    onSuccess: () => {
      toast.success('تم إضافة الدفعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionServiceDeposits', service.id] });
      queryClient.invalidateQueries({ queryKey: ['admissionServices', service.admission_id] });
      reset();
      setAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الدفعة');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdmissionServiceDepositFormData> }) =>
      updateAdmissionServiceDeposit(id, data),
    onSuccess: () => {
      toast.success('تم تحديث الدفعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionServiceDeposits', service.id] });
      queryClient.invalidateQueries({ queryKey: ['admissionServices', service.admission_id] });
      reset();
      setEditDepositId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل تحديث الدفعة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdmissionServiceDeposit(id),
    onSuccess: () => {
      toast.success('تم حذف الدفعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionServiceDeposits', service.id] });
      queryClient.invalidateQueries({ queryKey: ['admissionServices', service.admission_id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حذف الدفعة');
    },
  });

  const onSubmit = (data: AdmissionServiceDepositFormData) => {
    if (editDepositId) {
      updateMutation.mutate({ id: editDepositId, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEdit = (deposit: any) => {
    setEditDepositId(deposit.id);
    reset({
      amount: deposit.amount,
      is_bank: deposit.is_bank,
      notes: deposit.notes || '',
    });
    setAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
      deleteMutation.mutate(id);
    }
  };

  const totalPaid = deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;
  const balance = (service.balance || 0) - totalPaid + (service.amount_paid || 0);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">الدفعات</Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => {
                setEditDepositId(null);
                reset({ amount: 0, is_bank: false, notes: '' });
                setAddDialogOpen(true);
              }}
            >
              إضافة دفعة
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="subtitle2">إجمالي المدفوع</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {totalPaid.toFixed(2)} ر.س
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: balance > 0 ? 'error.light' : 'success.light', color: 'common.white' }}>
                  <Typography variant="subtitle2">الرصيد المتبقي</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {balance.toFixed(2)} ر.س
                  </Typography>
                </Paper>
              </Box>

              {deposits && deposits.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>المبلغ</TableCell>
                        <TableCell align="center">طريقة الدفع</TableCell>
                        <TableCell>الملاحظات</TableCell>
                        <TableCell>المستخدم</TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell align="center">الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell>{deposit.amount.toFixed(2)} ر.س</TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {deposit.is_bank ? 'بنك' : 'نقدي'}
                            </Typography>
                          </TableCell>
                          <TableCell>{deposit.notes || '-'}</TableCell>
                          <TableCell>{deposit.user?.name || '-'}</TableCell>
                          <TableCell>
                            {new Date(deposit.created_at).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title="تعديل">
                                <IconButton size="small" color="primary" onClick={() => handleEdit(deposit)}>
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="حذف">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(deposit.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    لا توجد دفعات مسجلة
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Deposit Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setEditDepositId(null);
          reset();
        }}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editDepositId ? 'تعديل الدفعة' : 'إضافة دفعة'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="amount"
                control={control}
                rules={{ required: 'المبلغ مطلوب', min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من 0' } }}
                render={({ field, fieldState }) => (
                  <TextField
                    fullWidth
                    label="المبلغ"
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={addMutation.isPending || updateMutation.isPending}
                  />
                )}
              />
              <Controller
                name="is_bank"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="دفع بنكي"
                    disabled={addMutation.isPending || updateMutation.isPending}
                  />
                )}
              />
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={3}
                    {...field}
                    disabled={addMutation.isPending || updateMutation.isPending}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAddDialogOpen(false);
                setEditDepositId(null);
                reset();
              }}
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {addMutation.isPending || updateMutation.isPending ? (
                <CircularProgress size={20} />
              ) : editDepositId ? (
                'تحديث'
              ) : (
                'إضافة'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

