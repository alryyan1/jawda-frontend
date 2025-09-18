// src/components/lab/workstation/StatusAndInfoPanel.tsx
import React, { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";


import type { Patient } from "@/types/patients";
import { getPatientById } from "@/services/patientService";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import PatientDetailsLabEntry from "@/components/lab/workstation/PatientDetailsLabEntry";
import ActionsButtonsPanel from "@/components/lab/workstation/ActionsButtonsPanel";


interface StatusAndInfoPanelProps {
  patientId: number | null;
  visitId: number | null;
  patientLabQueueItem: PatientLabQueueItem | null;
}




const StatusAndInfoPanel: React.FC<StatusAndInfoPanelProps> = ({
  patientId,
  visitId,
  patientLabQueueItem,
}) => {

  const {
    data: patient,
    isLoading: isLoadingPatient,
  } = useQuery<Patient, Error>({
    queryKey: ["patientDetailsForInfoPanel", patientId],
    queryFn: () =>
      patientId
        ? getPatientById(patientId)
        : Promise.reject(new Error("Patient ID required")),
    enabled: !!patientId,
  });
  const resultsLocked = patient?.result_is_locked || false;

  const patientStatuses = useMemo(() => ({
    payment: { done: true, by: undefined },
    collected: { time: undefined, by: undefined },
    print: { time: undefined, by: undefined },
    authentication: { done: patient?.result_is_locked },
  }), [patient?.result_is_locked]);

  const getAgeString = useCallback(
    (p?: Patient | null): string => {
      if (!p) return "غير متوفر";
      const parts = [];
      if (p.age_year !== null && p.age_year !== undefined && p.age_year >= 0)
        parts.push(`${p.age_year}س`);
      if (p.age_month !== null && p.age_month !== undefined && p.age_month >= 0)
        parts.push(`${p.age_month}ش`);
      if (p.age_day !== null && p.age_day !== undefined && p.age_day >= 0)
        parts.push(`${p.age_day}ي`);
      if (
        parts.length === 0 &&
        (p.age_year === 0 || p.age_month === 0 || p.age_day === 0)
      )
        return `0ي`;
      return parts.length > 0
        ? parts.join(" ")
        : "غير متوفر";
    },
    []
  );


 

 


  if (!patientId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          اختر مريضاً لعرض المعلومات
        </p>
      </div>
    );
  }
  console.log(patientLabQueueItem,'patientLabQueueItem')

  return (
    <div dir="rtl" className="h-full bg-slate-50 dark:bg-slate-800/30 overflow-y-auto">
      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
        {patient ? (
          <PatientDetailsLabEntry
            visitId={visitId}
            patientName={patient.name}
            doctorName={patient.doctor?.name ?? null}
            date={patient.created_at as unknown as string}
            phone={patient.phone ?? null}
            paymentMethod={null}
            registeredBy={(patient as unknown as { registered_by?: string }).registered_by ?? null}
            age={getAgeString(patient)}
            statuses={patientStatuses}
            className="mb-2"
          />
        ) : !isLoadingPatient ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            بيانات المريض غير متوفرة
          </p>
        ) : null}
        
        <ActionsButtonsPanel
          visitId={visitId}
          patient={patient || null}
          patientLabQueueItem={patientLabQueueItem}
          resultsLocked={resultsLocked}
        />
      </div>
    </div>
  );
};

export default StatusAndInfoPanel;
