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
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { Droplets } from 'lucide-react';
import { addVisitIntakeOutput } from '@/services/visitIntakeOutputService';

interface AddIntakeOutputDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
}

interface FormValues {
  recorded_at: string;
  feeding: string;
  iv_fluid: string;
  maintenance: string;
  urine_output: string;
  insensible_loss: string;
  notes: string;
}

const toDatetimeLocalValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultFormValues = (): FormValues => ({
  recorded_at: toDatetimeLocalValue(new Date()),
  feeding: '',
  iv_fluid: '',
  maintenance: '',
  urine_output: '',
  insensible_loss: '',
  notes: '',
});

const toNumber = (value: string): number | undefined => {
  if (value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
};

const AddIntakeOutputDialog: React.FC<AddIntakeOutputDialogProps> = ({ open, onClose, visitId }) => {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: defaultFormValues(),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      addVisitIntakeOutput(visitId, {
        recorded_at: values.recorded_at ? new Date(values.recorded_at).toISOString() : undefined,
        feeding: toNumber(values.feeding),
        iv_fluid: toNumber(values.iv_fluid),
        maintenance: toNumber(values.maintenance),
        urine_output: toNumber(values.urine_output),
        insensible_loss: toNumber(values.insensible_loss),
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('تم تسجيل القراءة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['visitIntakeOutputs', visitId] });
      handleClose();
    },
    onError: () => toast.error('حدث خطأ أثناء تسجيل القراءة'),
  });

  const handleClose = () => {
    reset(defaultFormValues());
    onClose();
  };

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Droplets size={20} />
        تسجيل سوائل الدخول والخروج
      </DialogTitle>
      <Divider />

      <DialogContent dir="ltr" sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          size="small"
          fullWidth
          type="datetime-local"
          label="Time"
          InputLabelProps={{ shrink: true }}
          {...register('recorded_at')}
        />

        <Typography variant="subtitle2" color="text.secondary">
          Intake (ml)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField size="small" fullWidth type="number" label="Feeding" inputProps={{ min: 0, step: 'any' }} {...register('feeding')} />
          <TextField size="small" fullWidth type="number" label="IV fluid" inputProps={{ min: 0, step: 'any' }} {...register('iv_fluid')} />
          <TextField size="small" fullWidth type="number" label="Maintance" inputProps={{ min: 0, step: 'any' }} {...register('maintenance')} />
        </Box>

        <Typography variant="subtitle2" color="text.secondary">
          Output (ml)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField size="small" fullWidth type="number" label="Urine pure" inputProps={{ min: 0, step: 'any' }} {...register('urine_output')} />
          <TextField size="small" fullWidth type="number" label="Essnspulless" inputProps={{ min: 0, step: 'any' }} {...register('insensible_loss')} />
        </Box>

        <TextField
          label="ملاحظات"
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

export default AddIntakeOutputDialog;
