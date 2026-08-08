import React from 'react';
import { useForm, useFieldArray, Controller, type Control } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import { Pill, Plus, Trash2 } from 'lucide-react';
import { addVisitPrescription } from '@/services/visitPrescriptionService';
import type { VisitPrescriptionItemInput } from '@/types/prescriptions';

const DOSAGE_OPTIONS = [
  '5 مجم',
  '10 مجم',
  '25 مجم',
  '50 مجم',
  '100 مجم',
  '250 مجم',
  '500 مجم',
  '1 مجم',
  'قرص واحد',
  'نصف قرص',
  'قرصان',
  '5 مل',
  '10 مل',
];

const FREQUENCY_OPTIONS = [
  'مرة يوميًا',
  'مرتين يوميًا',
  'ثلاث مرات يوميًا',
  'أربع مرات يوميًا',
  'كل 6 ساعات',
  'كل 8 ساعات',
  'كل 12 ساعة',
  'عند اللزوم',
  'قبل النوم',
];

const DURATION_OPTIONS = ['3 أيام', '5 أيام', '7 أيام', '10 أيام', 'أسبوعين', 'شهر', 'مستمر', 'حسب الحاجة'];

const ROUTE_OPTIONS = [
  'عن طريق الفم',
  'حقن عضلي',
  'حقن وريدي',
  'موضعي',
  'تحت اللسان',
  'شرجي',
  'استنشاق',
  'قطرة عين',
  'قطرة أذن',
];

const INSTRUCTIONS_OPTIONS = [
  'بعد الأكل',
  'قبل الأكل',
  'مع الطعام',
  'على معدة فارغة',
  'يفضل مع كوب ماء كامل',
  'تجنب مع منتجات الألبان',
];

interface AddPrescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
}

interface FormValues {
  notes: string;
  items: VisitPrescriptionItemInput[];
}

interface PresetAutocompleteFieldProps {
  control: Control<FormValues>;
  name: `items.${number}.${'dosage' | 'frequency' | 'duration' | 'route' | 'instructions'}`;
  label: string;
  options: string[];
}

const PresetAutocompleteField: React.FC<PresetAutocompleteFieldProps> = ({ control, name, label, options }) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, value, ...field } }) => (
      <Autocomplete
        {...field}
        freeSolo
        options={options}
        value={value || ''}
        onChange={(_, newValue) => onChange(newValue || '')}
        onInputChange={(_, newValue) => onChange(newValue)}
        renderInput={(params) => <TextField {...params} size="small" label={label} fullWidth />}
      />
    )}
  />
);

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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ flex: '1 1 240px' }}>
                <TextField
                  size="small"
                  fullWidth
                  label="اسم الدواء"
                  required
                  {...register(`items.${index}.medication_name` as const)}
                />
              </Box>
              <Box sx={{ flex: '1 1 140px' }}>
                <PresetAutocompleteField
                  control={control}
                  name={`items.${index}.dosage` as const}
                  label="الجرعة"
                  options={DOSAGE_OPTIONS}
                />
              </Box>
              <Box sx={{ flex: '1 1 140px' }}>
                <PresetAutocompleteField
                  control={control}
                  name={`items.${index}.frequency` as const}
                  label="التكرار"
                  options={FREQUENCY_OPTIONS}
                />
              </Box>
              <Box sx={{ flex: '1 1 140px' }}>
                <PresetAutocompleteField
                  control={control}
                  name={`items.${index}.duration` as const}
                  label="المدة"
                  options={DURATION_OPTIONS}
                />
              </Box>
              <Box sx={{ flex: '1 1 140px' }}>
                <PresetAutocompleteField
                  control={control}
                  name={`items.${index}.route` as const}
                  label="طريقة الاستخدام"
                  options={ROUTE_OPTIONS}
                />
              </Box>
              <Box sx={{ flex: '1 1 100%' }}>
                <PresetAutocompleteField
                  control={control}
                  name={`items.${index}.instructions` as const}
                  label="تعليمات إضافية"
                  options={INSTRUCTIONS_OPTIONS}
                />
              </Box>
            </Box>
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
