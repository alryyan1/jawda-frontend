// src/components/clinic/ActivePatientsList.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { Patient } from "../../types/patients";
import type { ActivePatientVisit } from "@/types/patients";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveClinicPatients } from "@/services/clinicService";
import type { PaginatedResponse } from "@/types/common";
import ActivePatientCard from "./ActivePatientCard";
import PatientInfoDialog from "./PatientInfoDialog";
import i18n from "@/i18n";
import type { DoctorVisit } from "@/types/visits";

interface ActivePatientsListProps {
  onPatientSelect: (patient: Patient, visitId: number) => void;
  selectedPatientVisitId: number | null;
  doctorShiftId: number | null; // ID of the selected DoctorShift
  // Or, if DoctorTabs directly gives doctor_id:
  // doctorId: number | null;
  globalSearchTerm: string;
  currentClinicShiftId?: number | null; // Optional: overall clinic shift
}

const ActivePatientsList: React.FC<ActivePatientsListProps> = ({
  onPatientSelect,
  selectedPatientVisitId,
  doctorShiftId,
  globalSearchTerm,
  currentClinicShiftId,
}) => {
  const { t } = useTranslation(["clinic", "common"]);
  console.log("doctorShiftId", doctorShiftId);
  // Debounce search term for API calls if performance becomes an issue
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(globalSearchTerm);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(globalSearchTerm);
    }, 300); // 300ms delay
    return () => clearTimeout(handler);
  }, [globalSearchTerm]);

  const {
    data: visits,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<ActivePatientVisit[], Error>({
    queryKey: [
      "activePatients",
      doctorShiftId,
      debouncedSearchTerm,
      currentClinicShiftId,
    ],
    queryFn: async (): Promise<ActivePatientVisit[]> => {
      const response = await getActiveClinicPatients({
        doctor_shift_id: doctorShiftId,
        search: debouncedSearchTerm,
        clinic_shift_id: currentClinicShiftId,
      });
      console.log('API Response:', response);
      // Handle both paginated and non-paginated responses
      if (response && typeof response === 'object' && 'data' in response) {
        return (response as any).data;
      }
      return (response as ActivePatientVisit[]) || [];
    },
    placeholderData: keepPreviousData,
    enabled: !!doctorShiftId,
  });
  const [showPatientInfoDialog, setShowPatientInfoDialog] = useState(false);
  const [patientInfoVisit, setPatientInfoVisit] = useState<DoctorVisit | null>(null);

  const handleProfileClickForList = (visit: DoctorVisit) => {
    setPatientInfoVisit(visit);
    setShowPatientInfoDialog(true);
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
        {t("common:error.fetchFailed", {
          entity: t("clinic:workspace.title"),
          message: error.message,
        })}
      </p>
    );
  }

  const visitsList = Array.isArray(visits) ? visits : [];

  return (
    <div className="h-full flex flex-col">
      {isFetching && (
        <div className="text-xs text-muted-foreground p-1 text-center">
          <Loader2 className="inline h-3 w-3 animate-spin ltr:mr-1 rtl:ml-1" />
          {t("common:updatingList")}
        </div>
      )}
      {visitsList.length === 0 && !isLoading && !isFetching ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground p-6 border rounded-lg bg-card">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p>{t("clinic:workspace.noActivePatients")}</p>
          <p className="text-xs mt-1">{t("clinic:workspace.tryDifferentFilters")}</p>
        </div>
      ) : (
        <div className="flex-grow relative">
          <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
            <div style={{direction:i18n.dir()}} className="grid grid-cols-[repeat(auto-fit,300px)] gap-3 p-3 justify-start">
              {visitsList.map((visit: ActivePatientVisit) => (
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
