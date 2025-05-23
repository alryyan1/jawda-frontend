// src/components/clinic/ActivePatientsList.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { Patient } from "../../types/patients"; // Main Patient type
import type { ActivePatientVisit } from "@/types/patients"; // Or from patients.ts
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Clock, Phone, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getActiveClinicPatients } from "@/services/clinicService"; // Updated service
import type { PaginatedResponse } from "@/types/common";
import { Pointer } from "../magicui/pointer";
import { motion } from "framer-motion";

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
  });

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
        <ScrollArea className="flex-grow">
          <div className="space-y-3 pr-1">
            {visits.map((visit: ActivePatientVisit) => (
              <Card
                key={visit.id}
                className={cn(
                  "hover:shadow-md transition-all duration-200 cursor-pointer border-l-4",
                  selectedPatientVisitId === visit.id
                    ? "border-l-primary shadow-lg bg-primary/5"
                    : "border-l-transparent hover:border-l-primary/50",
                  "relative overflow-hidden"
                )}
                onClick={() => onPatientSelect(visit.patient, visit.id)}
              >
                <div className="absolute top-0 right-0 h-full w-1/3 pointer-events-none bg-gradient-to-l from-primary/5 to-transparent opacity-50" />
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-grow">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserCircle2 className="h-5 w-5 text-muted-foreground/70" />
                        <span className="truncate font-semibold" title={visit.patient.name}>
                          {visit.patient.name}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <Badge variant={
                            visit.status === "waiting"
                              ? "outline"
                              : visit.status === "with_doctor"
                              ? "default"
                              : "secondary"
                          }
                          className={cn(
                            "text-[10px] h-5",
                            visit.status === "with_doctor" && "bg-blue-500 text-white"
                          )}>
                            {t(`clinic:workspace.status.${visit.status}`)}
                          </Badge>
                        </span>
                        <span className="flex items-center gap-1 text-xs">
                          <Phone className="h-3.5 w-3.5" />
                          {visit.patient.phone}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {visit.requested_services_count > 0 && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                          {visit.requested_services_count} {t('clinic:workspace.services')}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {t("common:id")}: {visit.patient.id}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <strong>{t("common:doctor")}:</strong>{" "}
                      {visit.doctor?.name || t("common:unassigned")}
                    </span>
                  </div>
                </CardContent>
                {selectedPatientVisitId === visit.id && (
                  <Pointer>
                    <motion.div
                      animate={{
                        scale: [0.8, 1, 0.8],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="text-2xl">👆</div>
                    </motion.div>
                  </Pointer>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
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
    </div>
  );
};

export default ActivePatientsList;
