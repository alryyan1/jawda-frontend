import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import type { AdmissionDepositFormData } from '@/types/admissions';
import { addAdmissionDeposit } from '@/services/admissionService';

interface AdmissionDepositDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
}

export default function AdmissionDepositDialog({
  open,
  onClose,
  admissionId,
}: AdmissionDepositDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<AdmissionDepositFormData>({
    defaultValues: {
      amount: 0,
      is_bank: false,
      notes: '',
    },
  });

  const { control, handleSubmit, reset } = form;

  const mutation = useMutation({
    mutationFn: (data: AdmissionDepositFormData) => addAdmissionDeposit(admissionId, data),
    onSuccess: () => {
      toast.success('تم إضافة الدفعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionDeposits', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionTransactions', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionLedger', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionBalance', admissionId] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الدفعة');
    },
  });

  const onSubmit = (data: AdmissionDepositFormData) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>إضافة دفعة</DialogTitle>
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
                  disabled={mutation.isPending}
                  inputProps={{ min: 0.01, step: 0.01 }}
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
                  disabled={mutation.isPending}
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
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'إضافة'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

