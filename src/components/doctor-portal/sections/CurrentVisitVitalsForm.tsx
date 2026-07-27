import React from 'react';
import { useForm, Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Check, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { recordVisitVital, updateVisitVital, deleteVisitVital, getVisitVitals } from '@/services/visitVitalService';
import type { VisitVital, VisitVitalInput } from '@/types/vitals';

interface CurrentVisitVitalsFormProps {
  visitId: number;
  /** Used to invalidate the trend chart's query on record; trend spans the patient's whole file. */
  patientId: number | undefined;
}

interface VisitVitalFormValues {
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  heart_rate: string;
  temperature: string;
  spo2: string;
  weight: string;
}

const EMPTY_FORM_VALUES: VisitVitalFormValues = {
  blood_pressure_systolic: '', blood_pressure_diastolic: '',
  heart_rate: '', temperature: '', spo2: '', weight: '',
};

const VISIT_VITAL_FIELDS: { key: keyof VisitVitalFormValues; label: string; unit: string }[] = [
  { key: 'blood_pressure_systolic', label: 'ضغط انقباضي', unit: 'mmHg' },
  { key: 'blood_pressure_diastolic', label: 'ضغط انبساطي', unit: 'mmHg' },
  { key: 'heart_rate', label: 'معدل ضربات القلب', unit: 'bpm' },
  { key: 'temperature', label: 'درجة الحرارة', unit: '°C' },
  { key: 'spo2', label: 'تشبع الأكسجين', unit: '%' },
  { key: 'weight', label: 'الوزن', unit: 'kg' },
];

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/** Short "label value" fragments for whichever fields were actually recorded. */
const summarizeReadingParts = (v: VisitVital): string[] => {
  const parts: string[] = [];
  if (v.blood_pressure_systolic != null || v.blood_pressure_diastolic != null) {
    parts.push(`ضغط ${v.blood_pressure_systolic ?? '—'}/${v.blood_pressure_diastolic ?? '—'}`);
  }
  if (v.heart_rate != null) parts.push(`نبض ${v.heart_rate}`);
  if (v.temperature != null) parts.push(`حرارة ${v.temperature}°`);
  if (v.spo2 != null) parts.push(`تشبع ${v.spo2}%`);
  if (v.weight != null) parts.push(`وزن ${v.weight}كجم`);
  return parts.length > 0 ? parts : ['—'];
};

/** Converts a saved reading back into editable string form values. */
const toFormValues = (v: VisitVital): VisitVitalFormValues => ({
  blood_pressure_systolic: v.blood_pressure_systolic?.toString() ?? '',
  blood_pressure_diastolic: v.blood_pressure_diastolic?.toString() ?? '',
  heart_rate: v.heart_rate?.toString() ?? '',
  temperature: v.temperature?.toString() ?? '',
  spo2: v.spo2?.toString() ?? '',
  weight: v.weight?.toString() ?? '',
});

/** Builds a single-field payload — a blank string clears the field (`null`) rather than being omitted. */
const buildFieldPayload = (key: keyof VisitVitalFormValues, value: string): VisitVitalInput => ({
  [key]: value.trim() === '' ? null : Number(value),
});

/** A compact label + input row with a unit suffix, stacked vertically with its siblings. */
function VitalInput<T extends FieldValues>({
  name,
  control,
  label,
  unit,
  inputRef,
  onEnter,
  onCommit,
}: {
  name: Path<T>;
  control: Control<T>;
  label: string;
  unit: string;
  inputRef: (el: HTMLInputElement | null) => void;
  onEnter: () => void;
  onCommit: () => void;
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
              ref={(el) => { field.ref(el); inputRef(el); }}
              value={field.value ?? ''}
              id={name}
              className="h-8 pe-10 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Moving focus (instead of submitting) blurs this field, which
                  // triggers its own onCommit — no need to save here too.
                  e.preventDefault();
                  onEnter();
                }
              }}
              onBlur={() => {
                field.onBlur();
                onCommit();
              }}
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

/**
 * Quick-entry form for a vital reading tied to this specific visit (as opposed
 * to the patient's baseline reference values). Extracted from VitalsSection so
 * it can also render inside the pinned side panel in DoctorPortalPage.
 *
 * Entry is auto-save and per field: leaving a field (via Enter, Tab, or
 * click-away) persists just that field's value immediately, independently of
 * whatever the other fields currently hold. The first field saved creates the
 * reading; every field saved after that amends the same row with just its own
 * value. "قراءة جديدة" starts a fresh reading instead of continuing to amend
 * the current one.
 */
const CurrentVisitVitalsForm: React.FC<CurrentVisitVitalsFormProps> = ({ visitId, patientId }) => {
  const queryClient = useQueryClient();

  // This visit's own recorded readings — shown as a small history list so
  // switching away and back still shows what was already logged, instead of
  // just a blank form with no trace of the earlier save.
  const { data: readings = [] } = useQuery({
    queryKey: ['visitVitals', visitId],
    queryFn: () => getVisitVitals(visitId),
    enabled: !!visitId,
  });

  const { control, getValues, reset } = useForm<VisitVitalFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  // The reading currently being amended. Kept in a ref (not just state) so the
  // save queue below always reads the freshest id, even mid-chain before a
  // re-render has landed.
  const activeVitalIdRef = React.useRef<number | null>(null);
  const [, forceRender] = React.useReducer((c: number) => c + 1, 0);
  const setActiveVitalId = (id: number | null) => { activeVitalIdRef.current = id; forceRender(); };

  // Last-saved string value per field, so re-blurring a field that hasn't
  // changed doesn't fire a redundant save — tracked per field (rather than
  // one whole-form snapshot) since each field now saves independently.
  const lastSavedValuesRef = React.useRef<VisitVitalFormValues>({ ...EMPTY_FORM_VALUES });
  // Saves are chained rather than fired concurrently so a fast Tab-Tab-Tab
  // across fields doesn't race two "create" calls before the first one
  // returns an id for the rest to amend.
  const saveChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const pendingSavesRef = React.useRef(0);
  const [isSaving, setIsSaving] = React.useState(false);

  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const commitField = React.useCallback((key: keyof VisitVitalFormValues) => {
    const value = getValues(key);
    if (value === lastSavedValuesRef.current[key]) return;
    // Nothing saved yet for this reading and this field is blank — nothing to create.
    if (value.trim() === '' && activeVitalIdRef.current === null) return;
    lastSavedValuesRef.current[key] = value;

    pendingSavesRef.current += 1;
    setIsSaving(true);

    saveChainRef.current = saveChainRef.current.then(async () => {
      try {
        const payload = buildFieldPayload(key, value);
        const vital = activeVitalIdRef.current
          ? await updateVisitVital(visitId, activeVitalIdRef.current, payload)
          : await recordVisitVital(visitId, payload);
        setActiveVitalId(vital.id);
        queryClient.invalidateQueries({ queryKey: ['vitalsTrend', patientId] });
        queryClient.invalidateQueries({ queryKey: ['visitVitals', visitId] });
      } catch (error) {
        toast.error(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message
            || 'فشل تسجيل العلامات الحيوية'
        );
      } finally {
        pendingSavesRef.current -= 1;
        if (pendingSavesRef.current === 0) setIsSaving(false);
      }
    });
  }, [getValues, patientId, queryClient, visitId]);

  const handleEnter = (index: number) => {
    const nextIndex = index + 1;
    if (nextIndex < VISIT_VITAL_FIELDS.length) {
      inputRefs.current[nextIndex]?.focus();
    } else {
      inputRefs.current[index]?.blur();
    }
  };

  const handleNewReading = () => {
    reset(EMPTY_FORM_VALUES);
    setActiveVitalId(null);
    lastSavedValuesRef.current = { ...EMPTY_FORM_VALUES };
    inputRefs.current[0]?.focus();
  };

  // Loads a past reading into the form above for editing — same inputs, same
  // auto-save on blur, just amending that reading's id instead of a fresh one.
  const handleEditReading = (v: VisitVital) => {
    const values = toFormValues(v);
    reset(values);
    setActiveVitalId(v.id);
    lastSavedValuesRef.current = { ...values };
    inputRefs.current[0]?.focus();
  };

  const deleteMutation = useMutation({
    mutationFn: (vitalId: number) => deleteVisitVital(visitId, vitalId),
    onSuccess: (_data, vitalId) => {
      toast.success('تم حذف القراءة');
      queryClient.invalidateQueries({ queryKey: ['visitVitals', visitId] });
      queryClient.invalidateQueries({ queryKey: ['vitalsTrend', patientId] });
      if (activeVitalIdRef.current === vitalId) {
        handleNewReading();
      }
    },
    onError: () => toast.error('فشل حذف القراءة'),
  });

  // Most recent first, capped to a handful — the vitals tab's trend chart is
  // the place for the full history.
  const recentReadings = [...readings].reverse().slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-1.5">
        {VISIT_VITAL_FIELDS.map(({ key, label, unit }, index) => (
          <VitalInput
            key={key}
            name={key}
            control={control}
            label={label}
            unit={unit}
            inputRef={(el) => { inputRefs.current[index] = el; }}
            onEnter={() => handleEnter(index)}
            onCommit={() => commitField(key)}
          />
        ))}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {isSaving && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                جارٍ الحفظ...
              </>
            )}
            {!isSaving && activeVitalIdRef.current && (
              <>
                <Check className="h-3 w-3" />
                تم الحفظ
              </>
            )}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleNewReading}>
            قراءة جديدة
          </Button>
        </div>
      </form>

      {recentReadings.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">قراءات مسجلة لهذه الزيارة</span>
            {recentReadings.map((r, index) => (
              <React.Fragment key={r.id}>
                {index > 0 && <Separator />}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEditReading(r)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditReading(r); }}
                  className={`flex items-start gap-2 rounded-md border px-1.5 py-1 text-xs cursor-pointer hover:bg-muted ${
                    activeVitalIdRef.current === r.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex flex-1 flex-col min-w-0">
                    <span className="shrink-0 pb-0.5 text-muted-foreground">{formatTime(r.recorded_at)}</span>
                    <div className="flex flex-col divide-y divide-border">
                      {summarizeReadingParts(r).map((part, i) => (
                        <span key={i} className="truncate py-0.5">{part}</span>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CurrentVisitVitalsForm;
