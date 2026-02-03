import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import type { AdmissionTransactionFormData } from '@/types/admissions';
import { addAdmissionTransaction } from '@/services/admissionService';

interface AdmissionDiscountDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
  balance?: number;
}

export default function AdmissionDiscountDialog({
  open,
  onClose,
  admissionId,
  balance,
}: AdmissionDiscountDialogProps) {
  const queryClient = useQueryClient();
  const amountInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<Omit<AdmissionTransactionFormData, 'type' | 'is_bank'>>({
    defaultValues: {
      amount: 0,
      description: '',
      notes: '',
      reference_type: 'manual',
    },
  });

  const { control, handleSubmit, reset } = form;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        amount: 0,
        description: '',
        notes: '',
        reference_type: 'manual',
      });
      // Focus on amount input after a short delay
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 100);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (data: Omit<AdmissionTransactionFormData, 'type' | 'is_bank'>) => {
      const transactionData: AdmissionTransactionFormData = {
        ...data,
        type: 'debit',
        is_bank: false, // Always false for discounts
      };
      return addAdmissionTransaction(admissionId, transactionData);
    },
    onSuccess: () => {
      toast.success('تم إضافة الخصم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionTransactions', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionLedger', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionBalance', admissionId] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الخصم');
    },
  });

  const onSubmit = (data: Omit<AdmissionTransactionFormData, 'type' | 'is_bank'>) => {
    if (!data.description || data.description.trim() === '') {
      toast.error('الوصف مطلوب');
      return;
    }
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>إضافة خصم</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="amount"
              control={control}
              rules={{ 
                required: 'المبلغ مطلوب', 
                min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من 0' } 
              }}
              render={({ field, fieldState }) => (
                <TextField
                  fullWidth
                  label="مبلغ الخصم"
                  type="number"
                  inputRef={amountInputRef}
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={mutation.isPending}
                  inputProps={{ min: 0.01, step: 0.01 }}
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              rules={{ required: 'الوصف مطلوب' }}
              render={({ field, fieldState }) => (
                <TextField
                  fullWidth
                  label="وصف الخصم"
                  {...field}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={mutation.isPending}
                  placeholder="مثال: تخفيض خاص، خصم موظف، إلخ"
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
                  disabled={mutation.isPending}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={mutation.isPending}>
            إلغاء
          </Button>
          <Button type="submit" variant="contained" color="warning" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'إضافة خصم'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
