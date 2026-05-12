// src/components/clinic/ActivePatientsList.tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Patient } from "../../types/patients";
import type { ActivePatientVisit } from "@/types/patients";
import { Loader2, Users, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveClinicPatients } from "@/services/clinicService";
import ActivePatientCard from "./ActivePatientCard";
import PatientInfoDialog from "./PatientInfoDialog";
import type { DoctorVisit } from "@/types/visits";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/api";
import { webUrl } from "@/pages/constants";

interface ActivePatientsListProps {
  onPatientSelect: (patient: Patient, visitId: number) => void;
  selectedPatientVisitId: number | null;
  doctorShiftId: number | null; // ID of the selected DoctorShift
  // Or, if DoctorTabs directly gives doctor_id:
  // doctorId: number | null;
}

const ActivePatientsList: React.FC<ActivePatientsListProps> = ({
  onPatientSelect,
  selectedPatientVisitId,
  doctorShiftId,
}) => {

  const { user } = useAuth();
  // Initialise from the prop so the first render already has the correct shift ID.
  // The effect keeps it in sync when the prop changes (e.g. doctor tab switch).
  const [currentDisplayedShiftId, setCurrentDisplayedShiftId] = useState<number | null>(doctorShiftId);
  useEffect(() => {
    setCurrentDisplayedShiftId(doctorShiftId);
  }, [doctorShiftId]);

  // Fetch adjacent shift IDs from the backend — two indexed queries instead of full pagination
  const { data: adjacentShifts } = useQuery<{ previous_id: number | null; next_id: number | null }, Error>({
    queryKey: ['doctorShiftAdjacent', currentDisplayedShiftId],
    queryFn: async () => {
      const response = await apiClient.get<{ previous_id: number | null; next_id: number | null }>(
        `/doctor-shifts/${currentDisplayedShiftId}/adjacent`
      );
      return response.data;
    },
    enabled: !!currentDisplayedShiftId,
  });

  const previousShiftId = adjacentShifts?.previous_id ?? null;
  const nextShiftId = adjacentShifts?.next_id ?? null;

  const targetDoctorShiftId = currentDisplayedShiftId ?? doctorShiftId;

  const {
    data: visits,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<ActivePatientVisit[], Error>({
    queryKey: [
      "activePatients",
      targetDoctorShiftId,
    ],
    queryFn: async (): Promise<ActivePatientVisit[]> => {
      if (!targetDoctorShiftId) return [];
      const response = await getActiveClinicPatients({
        doctor_shift_id: targetDoctorShiftId,
      });
      // Handle both paginated and non-paginated responses
      if (response && typeof response === 'object' && 'data' in response) {
        return (response as { data: ActivePatientVisit[] }).data;
      }
      return (response as ActivePatientVisit[]) || [];
    },
    // placeholderData: keepPreviousData,
    enabled: !!targetDoctorShiftId,
  });
  const [showPatientInfoDialog, setShowPatientInfoDialog] = useState(false);
  const [patientInfoVisit, setPatientInfoVisit] = useState<DoctorVisit | null>(null);

  const handleProfileClickForList = (visit: DoctorVisit) => {
    setPatientInfoVisit(visit);
    setShowPatientInfoDialog(true);
    console.log(visit,'visit')
  };

  if (isLoading && !isFetching) {
    // Show main loader only on initial load of new filter/page
    return (
      <div className="flex justify-center items-center h-40 pt-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive p-4">
        فشل في جلب قائمة المرضى النشطين: {error.message}
      </p>
    );
  }

  const visitsList = Array.isArray(visits) ? visits : [];
  console.log(visitsList,'visitsList')

  const handlePreviousShift = () => {
    if (previousShiftId) {
      setCurrentDisplayedShiftId(previousShiftId);
    }
  };

  const handleNextShift = () => {
    if (nextShiftId) {
      setCurrentDisplayedShiftId(nextShiftId);
    }
  };

  const canNavigatePrevious = previousShiftId !== null;
  // Disable next button only when on current shift (no next shift available)
  const canNavigateNext = nextShiftId !== null;

  const handleViewReport = (doctorShiftId: number) => {
    // Open doctor's clinic report in a new tab
    const reportUrl = `${webUrl}reports/clinic-report-old/pdf?doctor_shift_id=${doctorShiftId}`;
    window.open(reportUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Navigation Buttons */}
      {doctorShiftId && (
        <div className="flex items-center justify-center gap-2 p-2 border-b bg-card">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousShift}
            disabled={!canNavigatePrevious}
            className="h-8 w-8"
            title="الوردية السابقة"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {currentDisplayedShiftId !== doctorShiftId ? (
              <span>ID: {currentDisplayedShiftId}</span>
            ) : (
              'الحالية'
            )}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextShift}
            disabled={!canNavigateNext}
            className="h-8 w-8"
            title="الوردية التالية"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewReport(targetDoctorShiftId!)}
            disabled={!targetDoctorShiftId}
            className="h-8"
            title="عرض التقرير"
          >
            <FileText className="h-4 w-4 ml-2" />
            عرض التقرير
          </Button>
        </div>
      )}
      {isFetching && (
        <div className="text-xs text-muted-foreground p-1 text-center">
          <Loader2 className="inline h-3 w-3 animate-spin ltr:mr-1 rtl:ml-1" />
          جاري تحديث القائمة...
        </div>
      )}
      {visitsList.length === 0 && !isLoading && !isFetching ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground p-6 border rounded-lg bg-card">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p>لا يوجد مرضى نشطين</p>
          <p className="text-xs mt-1">جرب اختيار طبيب مختلف</p>
        </div>
      ) : (
        <div className="flex-grow relative">
          <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
            <div style={{direction:'rtl'}} className="grid grid-cols-[repeat(auto-fit,300px)] gap-3 p-3 justify-start">
              {visitsList.filter(visit =>  {
                if(visit.patient.company_id == null && user?.user_type == 'تامين'){
                  return false;
                }
                if(visit.patient.company && user?.user_type == 'خزنه موحده'){
                  return false;
                }
                return true;
              }).map((visit: ActivePatientVisit) => (
                <ActivePatientCard
                  key={visit.id}
                  visit={visit}
                  isSelected={selectedPatientVisitId === visit.id}
                  onSelect={onPatientSelect} // Passed down from ClinicPage
                  onProfileClick={handleProfileClickForList}
                  selectedPatientVisitIdInWorkspace={selectedPatientVisitId} // Pass this down
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      <PatientInfoDialog 
        isOpen={showPatientInfoDialog}
        onOpenChange={setShowPatientInfoDialog}
        visit={patientInfoVisit}
      />
    </div>
  );
};

export default ActivePatientsList;
