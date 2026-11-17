import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { Syringe } from 'lucide-react';
import { addVisitDose } from '@/services/visitDoseService';
import type { VisitDoseStatus } from '@/types/doses';

const STATUS_OPTIONS: { value: VisitDoseStatus; label: string }[] = [
  { value: 'given', label: 'تم إعطاؤها' },
  { value: 'not_given', label: 'لم تُعطَ' },
  { value: 'postponed', label: 'مؤجلة' },
];

interface AddDoseDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
}

interface FormValues {
  medication_name: string;
  dosage: string;
  status: VisitDoseStatus;
  administered_at: string;
  notes: string;
}

const toDatetimeLocalValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultFormValues = (): FormValues => ({
  medication_name: '',
  dosage: '',
  status: 'given',
  administered_at: toDatetimeLocalValue(new Date()),
  notes: '',
});

const AddDoseDialog: React.FC<AddDoseDialogProps> = ({ open, onClose, visitId }) => {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: defaultFormValues(),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      addVisitDose(visitId, {
        medication_name: values.medication_name,
        dosage: values.dosage,
        status: values.status,
        administered_at: values.administered_at ? new Date(values.administered_at).toISOString() : undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('تم تسجيل الجرعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['visitDoses', visitId] });
      handleClose();
    },
    onError: () => toast.error('حدث خطأ أثناء تسجيل الجرعة'),
  });

  const handleClose = () => {
    reset(defaultFormValues());
    onClose();
  };

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Syringe size={20} />
        تسجيل جرعة
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          size="small"
          fullWidth
          label="اسم الدواء"
          required
          {...register('medication_name')}
        />

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            label="الجرعة"
            required
            {...register('dosage')}
          />
          <TextField
            size="small"
            fullWidth
            select
            label="حالة الجرعة"
            required
            {...register('status')}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <TextField
          size="small"
          fullWidth
          type="datetime-local"
          label="وقت إعطاء الجرعة"
          InputLabelProps={{ shrink: true }}
          {...register('administered_at')}
        />

        <TextField
          label="ملاحظات التمريض"
          size="small"
          fullWidth
          multiline
          rows={2}
          {...register('notes')}
        />
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={handleClose} color="inherit">إلغاء</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending}
          onClick={handleSubmit(onSubmit)}
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDoseDialog;
