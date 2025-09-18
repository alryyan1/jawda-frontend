// src/components/lab/reception/LabPatientWorkspace.tsx
import React, { useState } from "react"; // Added useState
import { useQuery } from "@tanstack/react-query";
import type { DoctorVisit } from "@/types/visits";
import { UserCircle, X, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import LabRequestComponent from "@/components/clinic/LabRequestComponent";
import { getDoctorVisitById } from "@/services/visitService";
import PatientInfoDialog from "@/components/clinic/PatientInfoDialog"; // NEW IMPORT

interface LabPatientWorkspaceProps {
  activeVisitId: number;
  onClose?: () => void;
}

const LabPatientWorkspace: React.FC<LabPatientWorkspaceProps> = ({
  activeVisitId,
  onClose,
}) => {
  // استخدام نصوص عربية مباشرة بدلاً من i18n

  // --- NEW: State for the Patient Info Dialog ---
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const {
    data: visit,
    isLoading,
    error,
  } = useQuery<DoctorVisit, Error>({
    queryKey: ["activeVisitForWorkspace", activeVisitId],
    queryFn: () => getDoctorVisitById(activeVisitId),
    enabled: !!activeVisitId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (error || !visit || !visit.patient) {
    return (
      <div className="p-4 text-center text-destructive">
        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
        <p className="font-semibold">فشل التحميل</p>
        <p className="text-xs mt-1">{error?.message || "لا توجد بيانات متاحة"}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background dark:bg-card shadow-lg rounded-lg border">
        <header className="p-3 border-b flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* NEW: Make the icon a button to open the dialog */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full flex-shrink-0 p-0"
              onClick={() => setIsInfoDialogOpen(true)}
              aria-label={`عرض ملف ${visit.patient.name}`}
            >
              <UserCircle className="h-6 w-6 text-primary" />
            </Button>
            <div className="truncate">
              <h2
                className="text-md font-semibold truncate cursor-pointer hover:underline"
                title={visit.patient.name}
                onClick={() => setIsInfoDialogOpen(true)} // Also make name clickable
              >
                {visit.patient.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                رقم الزيارة: {visit.id} | الطبيب: {" "}
                {visit.doctor?.name || "غير محدد"}
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </header>

        {/* The LabRequestComponent remains as the main content */}
        <div className="flex flex-col p-2 h-full overflow-hidden">
          <LabRequestComponent
            selectedPatientVisit={visit}
            visitId={visit.id}
            patientId={visit.patient.id}
          />
        </div>
      </div>

      {/* Render the Dialog, controlled by this component's state */}
      <PatientInfoDialog
        isOpen={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
        visit={visit} // Pass the full visit object we already fetched
      />
    </>
  );
};

export default LabPatientWorkspace;
