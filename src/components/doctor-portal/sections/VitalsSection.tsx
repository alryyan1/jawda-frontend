import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, TrendingUp, Loader2, Pin, PinOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { saveMedicalHistory } from '@/services/patientMedicalHistoryService';
import { getPatientVitalsTrend } from '@/services/visitVitalService';
import type { PatientMedicalHistory } from '@/types/medicalHistory';
import VitalsTrendChart from './VitalsTrendChart';
import CurrentVisitVitalsForm from './CurrentVisitVitalsForm';

interface VitalsSectionProps {
  patientId: number | undefined;
  visitId?: number;
  medHistory: PatientMedicalHistory | undefined;
  isLoading: boolean;
  /** Whether the "current visit" vitals form is pinned as a side panel instead of shown inline here. */
  isVitalsPinned?: boolean;
  onToggleVitalsPinned?: () => void;
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

const VITAL_FIELDS: { key: keyof VitalsFormValues; label: string; unit: string }[] = [
  { key: 'baseline_bp',         label: 'ضغط الدم',          unit: 'mmHg' },
  { key: 'baseline_heart_rate', label: 'معدل ضربات القلب',  unit: 'bpm' },
  { key: 'baseline_temp',       label: 'درجة الحرارة',       unit: '°C' },
  { key: 'baseline_spo2',       label: 'تشبع الأكسجين',     unit: '%' },
  { key: 'baseline_weight',     label: 'الوزن',              unit: 'kg' },
  { key: 'baseline_height',     label: 'الطول',              unit: 'cm' },
  { key: 'baseline_rbs',        label: 'سكر الدم العشوائي', unit: 'mg/dL' },
];

const BMI_BADGE_CLASSES: Record<'info' | 'success' | 'warning' | 'error', string> = {
  info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  error: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

/** A compact label + input row with a unit suffix, stacked vertically with its siblings. */
function VitalInput<T extends FieldValues>({
  name,
  control,
  label,
  unit,
}: {
  name: Path<T>;
  control: Control<T>;
  label: string;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={name} className="w-28 shrink-0 text-xs text-muted-foreground">{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="relative flex-1">
            <Input
              {...field}
              value={field.value ?? ''}
              id={name}
              className="h-8 pe-10 text-sm"
            />
            <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[0.65rem] text-muted-foreground">
              {unit}
            </span>
          </div>
        )}
      />
    </div>
  );
}

const VitalsSection: React.FC<VitalsSectionProps> = ({
  patientId,
  visitId,
  medHistory,
  isLoading,
  isVitalsPinned = false,
  onToggleVitalsPinned,
}) => {
  const queryClient = useQueryClient();

  const { data: vitalsTrend = [] } = useQuery({
    queryKey: ['vitalsTrend', patientId],
    queryFn: () => getPatientVitalsTrend(patientId!),
    enabled: !!patientId,
  });

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
    if (b < 18.5) return { label: 'نقص الوزن', tone: 'info' as const };
    if (b < 25)   return { label: 'طبيعي', tone: 'success' as const };
    if (b < 30)   return { label: 'زيادة الوزن', tone: 'warning' as const };
    return { label: 'سمنة', tone: 'error' as const };
  }, [bmi]);

  const mutation = useMutation({
    mutationFn: (data: VitalsFormValues) => saveMedicalHistory(patientId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalHistory', patientId] });
      toast.success('تم حفظ العلامات الحيوية');
    },
    onError: (error: Error) => {
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
          || 'حدث خطأ أثناء الحفظ'
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={16} />
              <h3 className="text-sm font-bold">العلامات الحيوية الأساسية</h3>
            </div>

            <div className="flex flex-col gap-1.5">
              {VITAL_FIELDS.map(({ key, label, unit }) => (
                <VitalInput key={key} name={key} control={control} label={label} unit={unit} />
              ))}
            </div>

            {/* BMI display */}
            {bmi && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">مؤشر كتلة الجسم (BMI):</span>
                <span className="text-base font-bold">{bmi}</span>
                {bmiCategory && (
                  <Badge className={cn('text-[0.72rem]', BMI_BADGE_CLASSES[bmiCategory.tone])}>
                    {bmiCategory.label}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending || !patientId}>
            {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            حفظ العلامات الحيوية
          </Button>
        </div>
      </form>

      {visitId && (
        <>
          <Separator />

          <Card>
            <CardContent className="p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">تسجيل علامات حيوية لهذه الزيارة</h3>
                {onToggleVitalsPinned && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onToggleVitalsPinned}
                    title={isVitalsPinned ? 'إلغاء التثبيت والعودة إلى التبويبات' : 'تثبيت في الشريط الجانبي'}
                  >
                    {isVitalsPinned ? <PinOff size={15} /> : <Pin size={15} />}
                  </Button>
                )}
              </div>

              {isVitalsPinned ? (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  مثبت في الشريط الجانبي — يمكنك تسجيل العلامات الحيوية من هناك أثناء تصفح باقي التبويبات.
                </div>
              ) : (
                <CurrentVisitVitalsForm visitId={visitId} patientId={patientId} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={18} />
          <h3 className="text-sm font-bold">الاتجاه عبر الزيارات</h3>
        </div>
        <VitalsTrendChart vitals={vitalsTrend} />
      </div>
    </div>
  );
};

export default VitalsSection;
