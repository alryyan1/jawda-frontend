import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PinOff, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDoctorVisitById } from '@/services/visitService';
import type { DoctorVisit } from '@/types/visits';
import type { ActivePatientVisit } from '@/types/patients';
import CurrentVisitVitalsForm from './sections/CurrentVisitVitalsForm';

interface PinnedVitalsPanelProps {
  visitId: number;
  initialVisit: ActivePatientVisit | null;
  onUnpin: () => void;
}

/**
 * Docked side panel showing the current visit's quick vitals entry form,
 * kept visible regardless of which workspace tab is active. Sits opposite
 * the patient queue panel in DoctorPortalPage so both stay reachable at once.
 */
const PinnedVitalsPanel: React.FC<PinnedVitalsPanelProps> = ({ visitId, initialVisit, onUnpin }) => {
  // Same query key PatientWorkspace uses for this visit — shares its cache
  // entry rather than issuing a second network request.
  const { data: visit } = useQuery<DoctorVisit>({
    queryKey: ['doctorVisit', visitId],
    queryFn: () => getDoctorVisitById(visitId),
    enabled: !!visitId,
  });

  const patient = visit?.patient ?? initialVisit?.patient;
  const patientId = visit?.patient_id ?? initialVisit?.patient?.id;

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-s bg-background">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Activity size={15} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{patient?.name ?? '—'}</div>
            <div className="text-xs text-muted-foreground">علامات حيوية لهذه الزيارة</div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onUnpin}
          title="إلغاء التثبيت والعودة إلى التبويبات"
        >
          <PinOff size={15} />
        </Button>
      </div>

      <div className="p-3">
        {/* Keyed by visitId so switching patients remounts the form instead of
            carrying over unsaved input from the previous visit. */}
        <CurrentVisitVitalsForm key={visitId} visitId={visitId} patientId={patientId} />
      </div>
    </div>
  );
};

export default PinnedVitalsPanel;
