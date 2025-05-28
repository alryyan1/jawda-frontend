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
  const [currentPage, setCurrentPage] = useState(1);
  console.log("doctorShiftId", doctorShiftId);
  // Debounce search term for API calls if performance becomes an issue
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(globalSearchTerm);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(globalSearchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300); // 300ms delay
    return () => clearTimeout(handler);
  }, [globalSearchTerm]);

  const {
    data: paginatedVisits,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<PaginatedResponse<ActivePatientVisit>, Error>({
    queryKey: [
      "activePatients",
      doctorShiftId,
      debouncedSearchTerm,
      currentClinicShiftId,
      currentPage,
    ],
    queryFn: async () => {
      const response = await getActiveClinicPatients({
        doctor_shift_id: doctorShiftId,
        search: debouncedSearchTerm,
        clinic_shift_id: currentClinicShiftId,
        page: currentPage,
      });
      return response;
    },
    placeholderData: keepPreviousData,
    enabled: !!doctorShiftId,
  });
  const [showPatientInfoDialog, setShowPatientInfoDialog] = useState(false);
  const [patientInfoId, setPatientInfoId] = useState<number | null>(null);

  // Reset page to 1 if doctorShiftId changes
  useEffect(() => {
    setCurrentPage(1);
  }, [doctorShiftId]);

  if (isLoading && currentPage === 1 && !isFetching) {
    // Show main loader only on initial load of new filter/page
    return (
      <div className="flex justify-center items-center h-40 pt-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleProfileClickForList = (patientId: number) => {
    setPatientInfoId(patientId);
    setShowPatientInfoDialog(true);
  };

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

  const visits = paginatedVisits?.data || [];
  const meta = paginatedVisits?.meta;

  return (
    <div className="h-full flex flex-col">
      {isFetching && (
        <div className="text-xs text-muted-foreground p-1 text-center">
          <Loader2 className="inline h-3 w-3 animate-spin ltr:mr-1 rtl:ml-1" />
          {t("common:updatingList")}
        </div>
      )}
      {visits.length === 0 && !isLoading && !isFetching ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground p-6 border rounded-lg bg-card">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p>{t("clinic:workspace.noActivePatients")}</p>
          <p className="text-xs mt-1">{t("clinic:workspace.tryDifferentFilters")}</p>
        </div>
      ) : (
        <div className="flex-grow relative">
          <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
            <div style={{direction:i18n.dir()}} className="space-y-3 p-1 min-w-[250px]">
              {visits.map((visit: ActivePatientVisit) => (
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
    
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t shrink-0">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.previous")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("common:pagination.pageInfo", {
              current: meta.current_page,
              total: meta.last_page,
            })}
          </span>
          <Button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={currentPage === meta.last_page || isFetching}
            size="sm"
            variant="outline"
          >
            {t("common:pagination.next")}
          </Button>
        </div>
      )}
      
      <PatientInfoDialog 
        isOpen={showPatientInfoDialog}
        onOpenChange={setShowPatientInfoDialog}
        patientId={patientInfoId}
      />
    </div>
  );
};

export default ActivePatientsList;
