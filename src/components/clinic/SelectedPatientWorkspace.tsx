// src/components/clinic/SelectedPatientWorkspace.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

import type { Patient } from "@/types/patiens"; // Base patient type
import type { DoctorVisit } from "@/types/visits"; // Detailed visit type
import {
  getDoctorVisitById,
  updateDoctorVisitStatus,
} from "@/services/visitService";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // For section navigation
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  X,
  UserCircle,
  Phone,
  CalendarDays,
 
  ListOrdered,
  Type,
  StickyNote,
  Microscope,
  Pill,
  FileText,
  AlertTriangle,
  VenusAndMars,
} from "lucide-react";
import { toast } from "sonner";

import { Label } from "../ui/label";
import ServicesRequestComponent from "./ServicesRequestComponent";
// Placeholders for other sections (Vitals, ClinicalNotes, etc.)
// import VitalsSection from './VitalsSection';
// import ClinicalNotesSection from './ClinicalNotesSection';

interface SelectedPatientWorkspaceProps {
  // We receive the initial patient object for quick display, but fetch full visit for details
  initialPatient: Patient;
  visitId: number;
  onClose?: () => void;
}

// Possible visit statuses (align with backend)
const VISIT_STATUSES = [
  "waiting",
  "with_doctor",
  "lab_pending",
  "imaging_pending",
  "payment_pending",
  "completed",
  "cancelled",
  "no_show",
];

const SelectedPatientWorkspace: React.FC<SelectedPatientWorkspaceProps> = ({
  initialPatient,
  visitId,
  onClose,
}) => {
  const { t, i18n } = useTranslation([
    "clinic",
    "common",
    "services",
    "patients",
  ]);
  const queryClient = useQueryClient();
  const dateLocale = i18n.language.startsWith("ar") ? arSA : enUS;

  const visitQueryKey = ["doctorVisit", visitId];

  const {
    data: visit,
    isLoading,
    error: visitError,
    isFetching,
  } = useQuery<DoctorVisit, Error>({
    queryKey: visitQueryKey,
    queryFn: () => getDoctorVisitById(visitId),
    enabled: !!visitId,
  });

  const patient = visit?.patient || initialPatient; // Use fetched patient if available, else initial

  const statusUpdateMutation = useMutation({
    mutationFn: (newStatus: string) =>
      updateDoctorVisitStatus(visitId, newStatus),
    onSuccess: (updatedVisitData) => {
      toast.success(t("clinic:visit.statusUpdateSuccess"));
      queryClient.setQueryData(visitQueryKey, updatedVisitData); // Optimistically update
      queryClient.invalidateQueries({ queryKey: ["activePatients"] }); // Refresh active list
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("clinic:visit.statusUpdateFailed")
      );
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (visit && visit.status !== newStatus) {
      statusUpdateMutation.mutate(newStatus);
    }
  };

  const getAgeString = (p?: Patient) => {
    if (!p) return t("common:notAvailable_short", "N/A");
    const parts = [];
    if (p.age_year !== null && p.age_year !== undefined)
      parts.push(`${p.age_year}${t("common:years_shortInitial", "Y")}`);
    if (p.age_month !== null && p.age_month !== undefined)
      parts.push(`${p.age_month}${t("common:months_shortInitial", "M")}`);
    if (p.age_day !== null && p.age_day !== undefined)
      parts.push(`${p.age_day}${t("common:days_shortInitial", "D")}`);
    return parts.length > 0
      ? parts.join(" ")
      : t("common:notAvailable_short", "N/A");
  };

  if (isLoading && !visit) {
    // Initial loading state
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-card p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {t("common:loadingDetails", "Loading patient details...")}
        </p>
      </div>
    );
  }

  if (visitError) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-card p-6 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p>
          {t("common:error.fetchFailed", {
            entity: t("clinic:selectedPatientWorkspace.titleShort", "Visit"),
          })}
        </p>
        <p className="text-xs mt-1">{visitError.message}</p>
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            {t("common:close")}
          </Button>
        )}
      </div>
    );
  }

  if (!visit || !patient) {
    // Should not happen if no error and not loading, but good check
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background dark:bg-card p-6">
        <p>{t("clinic:selectedPatientWorkspace.noPatientData")}</p>
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            {t("common:close")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background dark:bg-card shadow-xl">
      {/* Patient & Visit Header */}
      <header className="flex-shrink-0 p-3 sm:p-4 border-b bg-card sticky top-0 z-20">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {" "}
            {/* min-w-0 for truncate */}
            <UserCircle className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h2
                className="text-lg sm:text-xl font-semibold truncate"
                title={patient.name}
              >
                {patient.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("common:visitId", "Visit #")}
                {visit.id} -{" "}
                {visit.visit_date
                  ? format(new Date(visit.visit_date), "PPP", {
                      locale: dateLocale,
                    })
                  : ""}
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground items-center">
          <span className="flex items-center">
            <VenusAndMars className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
            {t(`common:genderEnum.${patient.gender}`, patient.gender)}
          </span>
          <span className="flex items-center">
            <CalendarDays className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
            {getAgeString(patient)}
          </span>
          <span className="flex items-center">
            <Phone className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
            {patient.phone}
          </span>
          <div className="flex items-center gap-1">
            <Label htmlFor={`visit-status-${visit.id}`} className="text-xs">
              {t("common:status")}:
            </Label>
            <Select
              value={visit.status}
              onValueChange={handleStatusChange}
              disabled={statusUpdateMutation.isPending}
              dir={i18n.dir()}
            >
              <SelectTrigger
                id={`visit-status-${visit.id}`}
                className="h-7 text-xs px-2 py-1 w-auto min-w-[120px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_STATUSES.map((statusKey) => (
                  <SelectItem key={statusKey} value={statusKey}>
                    {t(`clinic:workspace.status.${statusKey}`, statusKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusUpdateMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </div>
        </div>
        {visit.doctor && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("common:doctor")}: {visit.doctor.name}
          </p>
        )}
      </header>

      {/* Tabs for different sections of the workspace */}
      <Tabs
        defaultValue="services"
        className="flex-grow flex flex-col overflow-hidden"
      >
        <ScrollArea className="flex-shrink-0 border-b">
          {" "}
          {/* Make tabs scrollable if many */}
          <TabsList className="mx-3 my-2 grid w-auto grid-flow-col auto-cols-max gap-2 p-1 h-auto">
            <TabsTrigger value="services" className="text-xs px-3 py-1.5">
              <ListOrdered className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.services")}
            </TabsTrigger>
            <TabsTrigger
              value="vitals"
              className="text-xs px-3 py-1.5"
              disabled
            >
              <Heart className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.vitals")}
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs px-3 py-1.5" disabled>
              <StickyNote className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.notes")}
            </TabsTrigger>
            <TabsTrigger value="lab" className="text-xs px-3 py-1.5" disabled>
              <Microscope className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.lab")}
            </TabsTrigger>
            <TabsTrigger
              value="prescription"
              className="text-xs px-3 py-1.5"
              disabled
            >
              <Pill className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.prescription")}
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="text-xs px-3 py-1.5"
              disabled
            >
              <FileText className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
              {t("clinic:tabs.documents")}
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent
          value="services"
          className="flex-grow overflow-y-auto p-3 sm:p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <ServicesRequestComponent patientId={patient.id} visitId={visit.id} />
        </TabsContent>
        <TabsContent
          value="vitals"
          className="flex-grow overflow-y-auto p-3 sm:p-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Vitals (TODO)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Vitals entry & history.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent
          value="notes"
          className="flex-grow overflow-y-auto p-3 sm:p-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Clinical Notes (TODO)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Doctor's examination notes.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent
          value="lab"
          className="flex-grow overflow-y-auto p-3 sm:p-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Lab Requests/Results (TODO)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Lab module integration.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent
          value="prescription"
          className="flex-grow overflow-y-auto p-3 sm:p-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Prescriptions (TODO)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Prescription writing module.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent
          value="documents"
          className="flex-grow overflow-y-auto p-3 sm:p-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Documents/Attachments (TODO)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Upload and view patient documents.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default SelectedPatientWorkspace;
