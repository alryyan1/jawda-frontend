import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import { Pill, Plus, Trash2 } from 'lucide-react';
import { addVisitPrescription } from '@/services/visitPrescriptionService';
import type { VisitPrescriptionItemInput } from '@/types/prescriptions';

interface AddPrescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
}

interface FormValues {
  notes: string;
  items: VisitPrescriptionItemInput[];
}

const EMPTY_ITEM: VisitPrescriptionItemInput = {
  medication_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: '',
  instructions: '',
};

const AddPrescriptionDialog: React.FC<AddPrescriptionDialogProps> = ({ open, onClose, visitId }) => {
  const queryClient = useQueryClient();

  const { control, register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { notes: '', items: [{ ...EMPTY_ITEM }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      addVisitPrescription(visitId, {
        notes: values.notes || undefined,
        items: values.items.filter((i) => i.medication_name.trim()),
      }),
    onSuccess: () => {
      toast.success('تم إضافة الوصفة الطبية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['visitPrescriptions', visitId] });
      handleClose();
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة الوصفة الطبية'),
  });

  const handleClose = () => {
    reset({ notes: '', items: [{ ...EMPTY_ITEM }] });
    onClose();
  };

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Pill size={20} />
        إضافة وصفة طبية
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fields.map((field, index) => (
          <Box
            key={field.id}
            sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, position: 'relative' }}
          >
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={4}>
                <TextField
                  size="small"
                  fullWidth
                  label="اسم الدواء"
                  required
                  {...register(`items.${index}.medication_name` as const)}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField size="small" fullWidth label="الجرعة" {...register(`items.${index}.dosage` as const)} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField size="small" fullWidth label="التكرار" {...register(`items.${index}.frequency` as const)} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField size="small" fullWidth label="المدة" {...register(`items.${index}.duration` as const)} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField size="small" fullWidth label="طريقة الاستخدام" {...register(`items.${index}.route` as const)} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  size="small"
                  fullWidth
                  label="تعليمات إضافية"
                  {...register(`items.${index}.instructions` as const)}
                />
              </Grid>
            </Grid>
            {fields.length > 1 && (
              <IconButton
                size="small"
                color="error"
                onClick={() => remove(index)}
                sx={{ position: 'absolute', top: 4, left: 4 }}
              >
                <Trash2 size={16} />
              </IconButton>
            )}
          </Box>
        ))}

        <Button
          variant="outlined"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => append({ ...EMPTY_ITEM })}
          sx={{ alignSelf: 'flex-start' }}
        >
          إضافة دواء آخر
        </Button>

        <TextField
          label="ملاحظات عامة (اختياري)"
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
          حفظ الوصفة
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPrescriptionDialog;
