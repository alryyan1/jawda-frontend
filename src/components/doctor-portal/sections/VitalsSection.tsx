import React, { useEffect, useMemo } from 'react';
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
import Chip from '@mui/material/Chip';
import { Activity } from 'lucide-react';
import { saveMedicalHistory } from '@/services/patientMedicalHistoryService';
import type { PatientMedicalHistory } from '@/types/medicalHistory';

interface VitalsSectionProps {
  patientId: number | undefined;
  medHistory: PatientMedicalHistory | undefined;
  isLoading: boolean;
}

interface VitalsFormValues {
  baseline_bp: string;
  baseline_temp: string;
  baseline_weight: string;
  baseline_height: string;
  baseline_heart_rate: string;
  baseline_spo2: string;
  baseline_rbs: string;
}

const VITAL_FIELDS: { key: keyof VitalsFormValues; label: string; unit: string; placeholder: string }[] = [
  { key: 'baseline_bp',         label: 'ضغط الدم',          unit: 'mmHg',  placeholder: '120/80' },
  { key: 'baseline_heart_rate', label: 'معدل ضربات القلب',  unit: 'bpm',   placeholder: '72' },
  { key: 'baseline_temp',       label: 'درجة الحرارة',       unit: '°C',    placeholder: '37.0' },
  { key: 'baseline_spo2',       label: 'تشبع الأكسجين',     unit: '%',     placeholder: '98' },
  { key: 'baseline_weight',     label: 'الوزن',              unit: 'kg',    placeholder: '70' },
  { key: 'baseline_height',     label: 'الطول',              unit: 'cm',    placeholder: '170' },
  { key: 'baseline_rbs',        label: 'سكر الدم العشوائي', unit: 'mg/dL', placeholder: '100' },
];

const VitalsSection: React.FC<VitalsSectionProps> = ({ patientId, medHistory, isLoading }) => {
  const queryClient = useQueryClient();

  const { control, handleSubmit, watch, reset } = useForm<VitalsFormValues>({
    defaultValues: {
      baseline_bp: '', baseline_temp: '', baseline_weight: '',
      baseline_height: '', baseline_heart_rate: '', baseline_spo2: '', baseline_rbs: '',
    },
  });

  useEffect(() => {
    if (medHistory) {
      reset({
        baseline_bp:         medHistory.baseline_bp ?? '',
        baseline_temp:       medHistory.baseline_temp ?? '',
        baseline_weight:     medHistory.baseline_weight ?? '',
        baseline_height:     medHistory.baseline_height ?? '',
        baseline_heart_rate: medHistory.baseline_heart_rate ?? '',
        baseline_spo2:       medHistory.baseline_spo2 ?? '',
        baseline_rbs:        medHistory.baseline_rbs ?? '',
      });
    }
  }, [medHistory, reset]);

  const weight = parseFloat(watch('baseline_weight'));
  const height = parseFloat(watch('baseline_height'));
  const bmi = useMemo(() => {
    if (weight > 0 && height > 0) {
      const heightM = height / 100;
      return (weight / (heightM * heightM)).toFixed(1);
    }
    return null;
  }, [weight, height]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    const b = parseFloat(bmi);
    if (b < 18.5) return { label: 'نقص الوزن', color: 'info' as const };
    if (b < 25)   return { label: 'طبيعي', color: 'success' as const };
    if (b < 30)   return { label: 'زيادة الوزن', color: 'warning' as const };
    return { label: 'سمنة', color: 'error' as const };
  }, [bmi]);

  const mutation = useMutation({
    mutationFn: (data: VitalsFormValues) => saveMedicalHistory(patientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('تم حفظ العلامات الحيوية');
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Activity size={18} />
          <Typography variant="subtitle2" fontWeight={700}>العلامات الحيوية الأساسية</Typography>
        </Box>
        <Grid container spacing={2}>
          {VITAL_FIELDS.map(({ key, label, unit, placeholder }) => (
            <Grid item xs={6} sm={4} md={3} key={key}>
              <Controller
                name={key}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label={label}
                    placeholder={placeholder}
                    size="small"
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                          {unit}
                        </Typography>
                      ),
                    }}
                    InputLabelProps={{ sx: { fontSize: '0.8rem' } }}
                    inputProps={{ style: { fontSize: '0.82rem' } }}
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>

        {/* BMI display */}
        {bmi && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              مؤشر كتلة الجسم (BMI):
            </Typography>
            <Typography variant="body1" fontWeight={700}>{bmi}</Typography>
            {bmiCategory && (
              <Chip label={bmiCategory.label} size="small" color={bmiCategory.color} sx={{ fontSize: '0.72rem' }} />
            )}
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          disabled={mutation.isPending || !patientId}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
        >
          حفظ العلامات الحيوية
        </Button>
      </Box>
    </Box>
  );
};

export default VitalsSection;
