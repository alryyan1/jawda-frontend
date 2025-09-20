// src/components/lab/workstation/StatusAndInfoPanel.tsx
import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Patient } from "@/types/patients";
import { getPatientById } from "@/services/patientService";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import PatientDetailsLabEntry from "@/components/lab/workstation/PatientDetailsLabEntry";
import ActionsButtonsPanel from "@/components/lab/workstation/ActionsButtonsPanel";
import apiClient from "@/services/api";


interface StatusAndInfoPanelProps {
  patientId: number | null;
  visitId: number | null;
  patientLabQueueItem: PatientLabQueueItem | null;
  onUploadStatusChange?: (isUploading: boolean) => void;
}




const StatusAndInfoPanel: React.FC<StatusAndInfoPanelProps> = ({
  patientId,
  visitId,
  patientLabQueueItem,
  onUploadStatusChange,
}) => {
  const [updatedPatient, setUpdatedPatient] = useState<Patient | null>(null);

  const handlePatientUpdate = useCallback((newPatient: Patient) => {
    setUpdatedPatient(newPatient);
  }, []);

  const queryClient = useQueryClient();

  // Mutation to toggle authentication status
  const toggleAuthenticationMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiClient.patch(`/patients/${patientId}/toggle-authentication`);
      return response.data;
    },
    onSuccess: (data) => {
      const updatedPatient = data.data;
      setUpdatedPatient(updatedPatient);
      toast.success(updatedPatient.result_auth ? "تم اعتماد النتائج" : "تم إلغاء اعتماد النتائج");
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["patientDetailsForInfoPanel", patientId],
      });
      queryClient.invalidateQueries({
        queryKey: ["patientDetailsForActionPane", patientId],
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : "حدث خطأ أثناء تغيير حالة المصادقة";
      toast.error(errorMessage);
    },
  });

  const handleAuthenticationToggle = useCallback(() => {
    if (!patientId) return;
    toggleAuthenticationMutation.mutate(patientId);
  }, [patientId, toggleAuthenticationMutation]);

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

  // Use updated patient data if available, otherwise use the original patient
  const currentPatient = updatedPatient || patient;
  console.log(patientLabQueueItem,'patientLabQueueItem')
  const patientStatuses = useMemo(() => ({
    payment: { done: true, by: undefined },
    collected: { time: undefined, by: undefined },
    print: {  done: patientLabQueueItem?.is_printed, by: null },
    authentication: { done: currentPatient?.result_auth },
  }), [currentPatient?.result_auth]);

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
        {currentPatient ? (
          <PatientDetailsLabEntry
            visitId={visitId}
            patientName={currentPatient.name}
            doctorName={patientLabQueueItem?.doctor_name ?? null} // doctor_name is not available in the interface
            date={currentPatient.created_at as unknown as string}
            phone={currentPatient.phone ?? null}
            paymentMethod={null}
            registeredBy={(patientLabQueueItem as unknown as { registered_by?: string }).registered_by ?? null}
            age={getAgeString(currentPatient)}
            statuses={patientStatuses}
            className="mb-2"
            onAuthenticationToggle={handleAuthenticationToggle}
          />
        ) : !isLoadingPatient ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            بيانات المريض غير متوفرة
          </p>
        ) : null}
        
        <ActionsButtonsPanel
          visitId={visitId}
          patient={currentPatient || null}
          patientLabQueueItem={patientLabQueueItem}
          resultsLocked={resultsLocked}
          onPatientUpdate={handlePatientUpdate}
          onUploadStatusChange={onUploadStatusChange}
        />
      </div>
    </div>
  );
};

export default StatusAndInfoPanel;
