// src/components/lab/workstation/StatusAndInfoPanel.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import type { Patient } from "@/types/patients";
import { getPatientById } from "@/services/patientService";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import PatientDetailsLabEntry from "@/components/lab/workstation/PatientDetailsLabEntry";
import ActionsButtonsPanel from "@/components/lab/workstation/ActionsButtonsPanel";
import apiClient from "@/services/api";
import { getSinglePatientLabQueueItem } from "@/services/labWorkflowService";


interface StatusAndInfoPanelProps {
  patientId: number | null;
  visitId: number | null;
  patientLabQueueItem: PatientLabQueueItem | null;
  patientData?: Patient | null; // Pass patient data from parent to avoid duplicate API calls
  onUploadStatusChange?: (isUploading: boolean) => void;
  setQueueItems: (items: PatientLabQueueItem[]) => void;
  handlePatientSelectFromQueue: (item: PatientLabQueueItem) => void;
}




const StatusAndInfoPanel: React.FC<StatusAndInfoPanelProps> = ({
  patientId,
  visitId,
  patientLabQueueItem,
  patientData,
  onUploadStatusChange,
  setQueueItems,
  handlePatientSelectFromQueue,
}) => {
  const [updatedPatient, setUpdatedPatient] = useState<PatientLabQueueItem | null>(null);

  const handlePatientUpdate = useCallback((newPatient: PatientLabQueueItem) => {
    setUpdatedPatient(newPatient);
    handlePatientSelectFromQueue(newPatient);
    console.log(newPatient, "newPatient from handlePatientUpdate");
    setQueueItems(prevItems => 
      prevItems.map(item => 
        item.visit_id === newPatient.id ? newPatient : item
      )
    );
  }, []);
  useEffect(() => {
      getSinglePatientLabQueueItem(visitId as number).then(data => {
        console.log(data, "data from getSinglePatientLabQueueItem");
        // handlePatientUpdate(data)
        handlePatientSelectFromQueue(data)
        // setQueueItems(data);
        setQueueItems((prev)=>prev.map(item=>item.visit_id === visitId ? data : item))
      });
  }, [visitId]);
  const queryClient = useQueryClient();

  // Mutation to toggle authentication status
  const toggleAuthenticationMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiClient.patch(`/patients/${patientId}/toggle-authentication`);
      return response.data;
    },
    onSuccess: (data) => {
      const updatedPatient = data.data;
      console.log(updatedPatient, "updatedPatient from toggleAuthenticationMutation");
      setUpdatedPatient(updatedPatient);
      
      toast.success(updatedPatient.result_auth ? "تم اعتماد النتائج" : "تم إلغاء اعتماد النتائج");
      
      // Invalidate the shared patient query
      queryClient.invalidateQueries({
        queryKey: ["patientDetails", patientId],
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

  // Use passed patient data if available, otherwise fetch it
  const {
    data: fetchedPatient,
    isLoading: isLoadingPatient,
  } = useQuery<Patient, Error>({
    queryKey: ["patientDetails", patientId],
    queryFn: () =>
      patientId
        ? getPatientById(patientId)
        : Promise.reject(new Error("Patient ID required")),
    enabled: !!patientId && !patientData, // Only fetch if patientData is not provided
  });

  // Use passed patient data or fetched data
  const patient = patientData || fetchedPatient;
  const resultsLocked = patient?.result_is_locked || false;

  // Use updated patient data if available, otherwise use the original patient
  const currentPatient = updatedPatient || patient;
  // console.log(patientLabQueueItem,'patientLabQueueItem')
  const patientStatuses = useMemo(() => ({
    payment: { done: patientLabQueueItem?.all_requests_paid , by: patientLabQueueItem?.all_requests_paid },
    collected: { time: undefined, by: undefined },
    print: {  done: patientLabQueueItem?.is_printed, by: null },
    authentication: { done: patientLabQueueItem?.result_auth },
  }), [patientLabQueueItem?.result_auth, patientLabQueueItem?.is_printed]);

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
  // console.log(patientLabQueueItem,'patientLabQueueItem')

  return (
    <div dir="rtl" className="h-full bg-slate-50 dark:bg-slate-800/30 overflow-y-auto">
      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
        {currentPatient ? (
          <PatientDetailsLabEntry
            visitId={visitId}
            patient={currentPatient}
            patientName={currentPatient.name}
            doctorName={(patientLabQueueItem as any)?.doctor_name ?? null} // doctor_name is not available in the interface
            date={currentPatient.created_at as unknown as string}
            phone={currentPatient.phone ?? null}
            paymentMethod={null}
            registeredBy={(patientLabQueueItem as unknown as { registered_by?: string }).registered_by ?? null}
            age={getAgeString(currentPatient)}
            statuses={patientStatuses}
            className="mb-2"
            onAuthenticationToggle={handleAuthenticationToggle}
          />
        ) : isLoadingPatient ? (
          <div className="mb-2">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-blue-200 p-3">
                <div className="flex items-center justify-center mb-2">
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="flex items-center justify-center">
                  <Skeleton className="h-6 w-40" />
                </div>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-12 w-12 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2 text-center">
            بيانات المريض غير متوفرة
          </p>
        )}
        
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

