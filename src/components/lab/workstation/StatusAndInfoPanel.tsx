// src/components/lab/workstation/StatusAndInfoPanel.tsx
import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import type { Patient } from "@/types/patients";
import { getPatientById } from "@/services/patientService";
import type { PatientLabQueueItem } from "@/types/labWorkflow";
import PatientDetailsLabEntry from "@/components/lab/workstation/PatientDetailsLabEntry";
import ActionsButtonsPanel from "@/components/lab/workstation/ActionsButtonsPanel";
import apiClient from "@/services/api";


interface StatusAndInfoPanelProps {
  selectedQueueItem: PatientLabQueueItem | null;
  patientId: number | null;
  visitId: number | null;
  patientLabQueueItem: PatientLabQueueItem | null;
  patientData?: Patient | null; // Pass patient data from parent to avoid duplicate API calls
  onUploadStatusChange?: (isUploading: boolean) => void;
  setQueueItems: React.Dispatch<React.SetStateAction<PatientLabQueueItem[]>>;
  handlePatientSelectFromQueue: (item: PatientLabQueueItem) => void;
}




const StatusAndInfoPanel: React.FC<StatusAndInfoPanelProps> = ({
  selectedQueueItem,
  patientId,
  visitId,
  patientLabQueueItem,
  patientData,
  setQueueItems,
  handlePatientSelectFromQueue,
}) => {
  const [updatedQueueItem, setUpdatedQueueItem] = useState<PatientLabQueueItem | null>(null);

  const handlePatientUpdate = useCallback((newQueueItem: PatientLabQueueItem) => {
    setUpdatedQueueItem(newQueueItem);
    handlePatientSelectFromQueue(newQueueItem);
    console.log(newQueueItem, "newQueueItem from handlePatientUpdate");
    setQueueItems((prevItems: PatientLabQueueItem[]) => 
      prevItems.map((item: PatientLabQueueItem) => 
        item.visit_id === newQueueItem.visit_id ? newQueueItem : item
      )
    );
  }, [handlePatientSelectFromQueue, setQueueItems]);
  // useEffect(() => {
  //     getSinglePatientLabQueueItem(visitId as number).then(data => {
  //       console.log(data, "data from getSinglePatientLabQueueItem");
  //       // handlePatientUpdate(data)
  //       handlePatientSelectFromQueue(data)
  //       // setQueueItems(data);
  //       setQueueItems((prev)=>prev.map(item=>item.visit_id === visitId ? data : item))
  //     });
  // }, [visitId]);
  const queryClient = useQueryClient();

  // Mutation to toggle authentication status
  const toggleAuthenticationMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const response = await apiClient.patch(`/patients/${patientId}/toggle-authentication`);
      return response.data;
    },
    onSuccess: (data) => {
      const updatedQueueItem = data.data as PatientLabQueueItem;
      console.log(updatedQueueItem, "updatedQueueItem from toggleAuthenticationMutation");
      handlePatientUpdate(updatedQueueItem);
      
      toast.success(updatedQueueItem.result_auth ? "تم اعتماد النتائج" : "تم إلغاء اعتماد النتائج");
      
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

  // Use updated queue item if available, otherwise use the original
  const currentQueueItem = updatedQueueItem || patientLabQueueItem;
  
  // console.log(patientLabQueueItem,'patientLabQueueItem')
  const patientStatuses = useMemo(() => ({
    payment: { done: currentQueueItem?.all_requests_paid, by: currentQueueItem?.all_requests_paid ? 'paid' : null },
    collected: { done:selectedQueueItem?.sample_collection_time !== null, by: undefined },
    print: { done: currentQueueItem?.is_printed, by: null },
    authentication: { done: currentQueueItem?.result_auth ?? false },
  }), [currentQueueItem?.result_auth, currentQueueItem?.is_printed, currentQueueItem?.all_requests_paid]);

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
  // console.log(currentPatient,'currentPatient in StatusAndInfoPanel',patientLabQueueItem,'patientLabQueueItem in StatusAndInfoPanel')

  return (
    <div dir="rtl" className="h-full bg-slate-50 dark:bg-slate-800/30 overflow-y-auto">
      <div className="p-1 sm:p-1 space-y-1 sm:space-y-3">
        {patient ? (
          <PatientDetailsLabEntry
            selectedQueueItem={selectedQueueItem}
            visitId={visitId}
            patient={patient}
            patientName={patient.name}
            doctorName={(currentQueueItem as unknown as { doctor_name?: string })?.doctor_name ?? null}
            date={patient.created_at as unknown as string}
            phone={patient.phone ?? null}
            paymentMethod={null}
            registeredBy={(currentQueueItem as unknown as { registered_by?: string })?.registered_by ?? null}
            age={getAgeString(patient)}
            statuses={patientStatuses}
            className="mb-1"
            onAuthenticationToggle={handleAuthenticationToggle}
            isAuthenticating={toggleAuthenticationMutation.isPending}
          />
        ) : isLoadingPatient ? (
          <div className="mb-1">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-blue-200 p-1">
                <div className="flex items-center justify-center mb-1">
                  <Skeleton className="h-8 w-24" />
                </div>
                <div className="flex items-center justify-center">
                  <Skeleton className="h-6 w-40" />
                </div>
              </div>
              <div className="p-1 space-y-1">
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
          patient={patient || null}
          patientLabQueueItem={currentQueueItem}
          resultsLocked={resultsLocked}
          onPatientUpdate={handlePatientUpdate}
        />
      </div>
    </div>
  );
};

export default StatusAndInfoPanel;

