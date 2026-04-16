import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { saveMedicalHistory } from '@/services/patientMedicalHistoryService';
import type { PatientMedicalHistory } from '@/types/medicalHistory';

interface SystemsReviewSectionProps {
  patientId: number | undefined;
  medHistory: PatientMedicalHistory | undefined;
  isLoading: boolean;
}

type SystemsFormValues = Pick<
  PatientMedicalHistory,
  | 'general_appearance_summary'
  | 'skin_summary'
  | 'head_neck_summary'
  | 'cardiovascular_summary'
  | 'respiratory_summary'
  | 'gastrointestinal_summary'
  | 'genitourinary_summary'
  | 'neurological_summary'
  | 'musculoskeletal_summary'
  | 'endocrine_summary'
  | 'peripheral_vascular_summary'
>;

const SYSTEMS: { key: keyof SystemsFormValues; label: string; arabicLabel: string }[] = [
  { key: 'general_appearance_summary',  label: 'General Appearance',   arabicLabel: 'المظهر العام' },
  { key: 'cardiovascular_summary',      label: 'Cardiovascular',       arabicLabel: 'القلب والأوعية' },
  { key: 'respiratory_summary',         label: 'Respiratory',          arabicLabel: 'الجهاز التنفسي' },
  { key: 'gastrointestinal_summary',    label: 'Gastrointestinal',     arabicLabel: 'الجهاز الهضمي' },
  { key: 'neurological_summary',        label: 'Neurological',         arabicLabel: 'الجهاز العصبي' },
  { key: 'musculoskeletal_summary',     label: 'Musculoskeletal',      arabicLabel: 'العضلات والهيكل' },
  { key: 'genitourinary_summary',       label: 'Genitourinary',        arabicLabel: 'الجهاز البولي التناسلي' },
  { key: 'endocrine_summary',           label: 'Endocrine',            arabicLabel: 'الغدد الصماء' },
  { key: 'skin_summary',                label: 'Skin',                 arabicLabel: 'الجلد' },
  { key: 'head_neck_summary',           label: 'Head & Neck',          arabicLabel: 'الرأس والعنق' },
  { key: 'peripheral_vascular_summary', label: 'Peripheral Vascular',  arabicLabel: 'الأوعية المحيطية' },
];

const defaultValues: SystemsFormValues = {
  general_appearance_summary: '', skin_summary: '', head_neck_summary: '',
  cardiovascular_summary: '', respiratory_summary: '', gastrointestinal_summary: '',
  genitourinary_summary: '', neurological_summary: '', musculoskeletal_summary: '',
  endocrine_summary: '', peripheral_vascular_summary: '',
};

const SystemsReviewSection: React.FC<SystemsReviewSectionProps> = ({ patientId, medHistory, isLoading }) => {
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset } = useForm<SystemsFormValues>({ defaultValues });

  useEffect(() => {
    if (medHistory) {
      reset({
        general_appearance_summary:  medHistory.general_appearance_summary ?? '',
        skin_summary:                medHistory.skin_summary ?? '',
        head_neck_summary:           medHistory.head_neck_summary ?? '',
        cardiovascular_summary:      medHistory.cardiovascular_summary ?? '',
        respiratory_summary:         medHistory.respiratory_summary ?? '',
        gastrointestinal_summary:    medHistory.gastrointestinal_summary ?? '',
        genitourinary_summary:       medHistory.genitourinary_summary ?? '',
        neurological_summary:        medHistory.neurological_summary ?? '',
        musculoskeletal_summary:     medHistory.musculoskeletal_summary ?? '',
        endocrine_summary:           medHistory.endocrine_summary ?? '',
        peripheral_vascular_summary: medHistory.peripheral_vascular_summary ?? '',
      });
    }
  }, [medHistory, reset]);

  const mutation = useMutation({
    mutationFn: (data: SystemsFormValues) => saveMedicalHistory(patientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('تم حفظ مراجعة الأجهزة');
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(d => mutation.mutate(d))} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          مراجعة الأجهزة والأعضاء
        </Typography>
        <Grid container spacing={2}>
          {SYSTEMS.map(({ key, arabicLabel }) => (
            <Grid item xs={12} sm={6} key={key}>
              <Controller
                name={key}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label={arabicLabel}
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    placeholder="طبيعي / موجودات..."
                    InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                    inputProps={{ style: { fontSize: '0.82rem' } }}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={mutation.isPending || !patientId}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
        >
          حفظ مراجعة الأجهزة
        </Button>
      </Box>
    </Box>
  );
};

export default SystemsReviewSection;
