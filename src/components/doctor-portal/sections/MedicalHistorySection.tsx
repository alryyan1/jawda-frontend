import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { saveMedicalHistory } from '@/services/patientMedicalHistoryService';
import type { PatientMedicalHistory } from '@/types/medicalHistory';

interface MedicalHistorySectionProps {
  patientId: number | undefined;
  medHistory: PatientMedicalHistory | undefined;
  isLoading: boolean;
}

type FormValues = Omit<PatientMedicalHistory, 'id' | 'patient_id' | 'created_at' | 'updated_at'>;

const CHRONIC_FLAGS: { key: keyof FormValues; label: string }[] = [
  { key: 'chronic_juandice',              label: 'يرقان مزمن' },
  { key: 'chronic_pallor',                label: 'شحوب مزمن' },
  { key: 'chronic_clubbing',              label: 'تضخم أصابع' },
  { key: 'chronic_cyanosis',              label: 'زرقة مزمنة' },
  { key: 'chronic_edema_feet',            label: 'وذمة القدمين' },
  { key: 'chronic_dehydration_tendency',  label: 'جفاف متكرر' },
  { key: 'chronic_lymphadenopathy',       label: 'اعتلال الغدد الليمفاوية' },
  { key: 'chronic_peripheral_pulses_issue', label: 'اضطراب النبض المحيطي' },
  { key: 'chronic_feet_ulcer_history',    label: 'تاريخ قرحة القدم' },
];

const MedicalHistorySection: React.FC<MedicalHistorySectionProps> = ({
  patientId,
  medHistory,
  isLoading,
}) => {
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      allergies: '', drug_history: '', family_history: '', social_history: '',
      past_medical_history: '', past_surgical_history: '',
      present_complains_summary: '', history_of_present_illness_summary: '',
      overall_care_plan_summary: '', general_prescription_notes_summary: '',
      chronic_juandice: false, chronic_pallor: false, chronic_clubbing: false,
      chronic_cyanosis: false, chronic_edema_feet: false, chronic_dehydration_tendency: false,
      chronic_lymphadenopathy: false, chronic_peripheral_pulses_issue: false,
      chronic_feet_ulcer_history: false,
    },
  });

  useEffect(() => {
    if (medHistory) {
      reset({
        allergies: medHistory.allergies ?? '',
        drug_history: medHistory.drug_history ?? '',
        family_history: medHistory.family_history ?? '',
        social_history: medHistory.social_history ?? '',
        past_medical_history: medHistory.past_medical_history ?? '',
        past_surgical_history: medHistory.past_surgical_history ?? '',
        present_complains_summary: medHistory.present_complains_summary ?? '',
        history_of_present_illness_summary: medHistory.history_of_present_illness_summary ?? '',
        overall_care_plan_summary: medHistory.overall_care_plan_summary ?? '',
        general_prescription_notes_summary: medHistory.general_prescription_notes_summary ?? '',
        chronic_juandice: medHistory.chronic_juandice ?? false,
        chronic_pallor: medHistory.chronic_pallor ?? false,
        chronic_clubbing: medHistory.chronic_clubbing ?? false,
        chronic_cyanosis: medHistory.chronic_cyanosis ?? false,
        chronic_edema_feet: medHistory.chronic_edema_feet ?? false,
        chronic_dehydration_tendency: medHistory.chronic_dehydration_tendency ?? false,
        chronic_lymphadenopathy: medHistory.chronic_lymphadenopathy ?? false,
        chronic_peripheral_pulses_issue: medHistory.chronic_peripheral_pulses_issue ?? false,
        chronic_feet_ulcer_history: medHistory.chronic_feet_ulcer_history ?? false,
      });
    }
  }, [medHistory, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => saveMedicalHistory(patientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('تم حفظ السجل الطبي');
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
      {/* Past history */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>التاريخ المرضي السابق</Typography>
        <Grid container spacing={2}>
          {[
            { key: 'allergies' as const,           label: 'الحساسية' },
            { key: 'drug_history' as const,        label: 'الأدوية السابقة' },
            { key: 'family_history' as const,      label: 'التاريخ العائلي' },
            { key: 'social_history' as const,      label: 'التاريخ الاجتماعي' },
            { key: 'past_medical_history' as const, label: 'أمراض سابقة' },
            { key: 'past_surgical_history' as const, label: 'عمليات جراحية سابقة' },
          ].map(({ key, label }) => (
            <Grid item xs={12} sm={6} key={key}>
              <Controller
                name={key}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label={label}
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                    inputProps={{ style: { fontSize: '0.82rem' } }}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Present illness */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>الشكوى الحالية</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="present_complains_summary"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  label="ملخص الشكوى"
                  multiline rows={3} fullWidth size="small"
                  InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                  inputProps={{ style: { fontSize: '0.82rem' } }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="history_of_present_illness_summary"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  label="تاريخ المرض الحالي"
                  multiline rows={3} fullWidth size="small"
                  InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                  inputProps={{ style: { fontSize: '0.82rem' } }}
                />
              )}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Chronic findings */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>الموجودات المزمنة</Typography>
        <Grid container>
          {CHRONIC_FLAGS.map(({ key, label }) => (
            <Grid item xs={6} sm={4} key={key}>
              <Controller
                name={key}
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!field.value}
                        onChange={e => field.onChange(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.8rem' }}>{label}</Typography>}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Care plan */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>خطة الرعاية</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="overall_care_plan_summary"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  label="خطة الرعاية العامة"
                  multiline rows={3} fullWidth size="small"
                  InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                  inputProps={{ style: { fontSize: '0.82rem' } }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="general_prescription_notes_summary"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  label="ملاحظات الوصفة العامة"
                  multiline rows={3} fullWidth size="small"
                  InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                  inputProps={{ style: { fontSize: '0.82rem' } }}
                />
              )}
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={mutation.isPending || !patientId}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
        >
          حفظ السجل الطبي
        </Button>
      </Box>
    </Box>
  );
};

export default MedicalHistorySection;
