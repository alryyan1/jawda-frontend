import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { saveMedicalHistory } from '@/services/patientMedicalHistoryService';
import { registerManyFieldTextSuggestions } from '@/services/fieldTextSuggestionService';
import FieldAutocompleteEditor from '@/components/common/FieldAutocompleteEditor';
import type { PatientMedicalHistory } from '@/types/medicalHistory';

interface MedicalHistorySectionProps {
  patientId: number | undefined;
  medHistory: PatientMedicalHistory | undefined;
  isLoading: boolean;
}

type FormValues = Omit<PatientMedicalHistory, 'id' | 'patient_id' | 'created_at' | 'updated_at'>;

const PAST_HISTORY_FIELDS: { key: keyof FormValues; label: string }[] = [
  { key: 'allergies',             label: 'الحساسية' },
  { key: 'drug_history',          label: 'الأدوية السابقة' },
  { key: 'family_history',        label: 'التاريخ العائلي' },
  { key: 'social_history',        label: 'التاريخ الاجتماعي' },
  { key: 'past_medical_history',  label: 'أمراض سابقة' },
  { key: 'past_surgical_history', label: 'عمليات جراحية سابقة' },
];

// Every free-text field in this section, used to grow each one's autocomplete
// dictionary after a successful save.
const TEXT_FIELD_KEYS: (keyof FormValues)[] = [
  ...PAST_HISTORY_FIELDS.map(f => f.key),
  'present_complains_summary',
  'history_of_present_illness_summary',
  'overall_care_plan_summary',
  'general_prescription_notes_summary',
];

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('تم حفظ السجل الطبي');

      // Best-effort: grow each field's autocomplete dictionary with whatever
      // was just typed, then refresh those suggestion lists in the cache.
      const entries = TEXT_FIELD_KEYS.map(key => ({ fieldKey: key, text: variables[key] as string | null | undefined }));
      registerManyFieldTextSuggestions(entries).then(updatedFieldKeys => {
        updatedFieldKeys.forEach(fieldKey => {
          queryClient.invalidateQueries({ queryKey: ['fieldTextSuggestions', fieldKey] });
        });
      });
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {PAST_HISTORY_FIELDS.map(({ key, label }) => (
            <Box key={key} sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' }, minWidth: 0 }}>
              <Controller
                name={key}
                control={control}
                render={({ field }) => (
                  <FieldAutocompleteEditor
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    fieldKey={key}
                    label={label}
                  />
                )}
              />
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Present illness */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>الشكوى الحالية</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' }, minWidth: 0 }}>
            <Controller
              name="present_complains_summary"
              control={control}
              render={({ field }) => (
                <FieldAutocompleteEditor
                  value={(field.value as string) ?? ''}
                  onChange={field.onChange}
                  fieldKey="present_complains_summary"
                  label="ملخص الشكوى"
                />
              )}
            />
          </Box>
          <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' }, minWidth: 0 }}>
            <Controller
              name="history_of_present_illness_summary"
              control={control}
              render={({ field }) => (
                <FieldAutocompleteEditor
                  value={(field.value as string) ?? ''}
                  onChange={field.onChange}
                  fieldKey="history_of_present_illness_summary"
                  label="تاريخ المرض الحالي"
                />
              )}
            />
          </Box>
        </Box>
      </Paper>

      {/* Chronic findings */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>الموجودات المزمنة</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
          {CHRONIC_FLAGS.map(({ key, label }) => (
            <Box key={key} sx={{ flexBasis: { xs: '50%', sm: '33.3333%' }, minWidth: 0 }}>
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
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Care plan */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>خطة الرعاية</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' }, minWidth: 0 }}>
            <Controller
              name="overall_care_plan_summary"
              control={control}
              render={({ field }) => (
                <FieldAutocompleteEditor
                  value={(field.value as string) ?? ''}
                  onChange={field.onChange}
                  fieldKey="overall_care_plan_summary"
                  label="خطة الرعاية العامة"
                />
              )}
            />
          </Box>
          <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' }, minWidth: 0 }}>
            <Controller
              name="general_prescription_notes_summary"
              control={control}
              render={({ field }) => (
                <FieldAutocompleteEditor
                  value={(field.value as string) ?? ''}
                  onChange={field.onChange}
                  fieldKey="general_prescription_notes_summary"
                  label="ملاحظات الوصفة العامة"
                />
              )}
            />
          </Box>
        </Box>
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
