// src/components/clinic/ActivePatientCard.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// Removed unused Select imports
import {
  UserCircle,
  Loader2,
  Copy,
  MessageSquare,
  History,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import type { ActivePatientVisit, Patient } from "@/types/patients";
import type { DoctorShift } from "@/types/doctors";
// Removed unused updateDoctorVisitStatus import
import { getActiveDoctorShifts } from "@/services/clinicService";
import type { Company } from "@/types/companies";
import { useAuth } from "@/contexts/AuthContext";

import CopyVisitToShiftDialog from "./CopyVisitToShiftDialog";
import SendWhatsAppDialog from "./SendWhatsAppDialog";
import PatientVisitHistoryDialog from "./PatientVisitHistoryDialog";
import CreateNewVisitForPatientDialog from "./CreateNewVisitForPatientDialog";
import Badge from "@mui/material/Badge"; // MUI Badge
// import type { DoctorVisit } from "@/types/visits";

const VISIT_STATUSES_FOR_DROPDOWN = [
  "waiting",
  "with_doctor",
  "lab_pending",
  "imaging_pending",
  "payment_pending",
  "completed",
  "cancelled",
  "no_show",
] as const;
type VisitStatus = (typeof VISIT_STATUSES_FOR_DROPDOWN)[number];



// Removed unused PaginatedActivePatientVisitsResponse and ApiError types

interface ActivePatientCardProps {
  visit: ActivePatientVisit;
  isSelected: boolean;
  onSelect: (patient: Patient, visitId: number) => void;
  onProfileClick: (visit: any) => void;
  selectedPatientVisitIdInWorkspace: number | null; // kept for API parity
}

const getStatusColor = (status: VisitStatus): string => {
  switch (status) {
    case "waiting":
      return "bg-amber-500";
    case "with_doctor":
      return "bg-blue-500";
    case "lab_pending":
    case "imaging_pending":
      return "bg-purple-500";
    case "payment_pending":
      return "bg-orange-500";
    case "completed":
      return "bg-green-500";
    case "cancelled":
    case "no_show":
      return "bg-red-500";
    default:
      return "bg-slate-500";
  }
};

// Removed unused getStatusText helper

const ActivePatientCard: React.FC<ActivePatientCardProps> = ({
  visit,
  isSelected,
  onSelect,
  onProfileClick,
  selectedPatientVisitIdInWorkspace,
}) => {
  const queryClient = useQueryClient();
  const { user: currentUser, currentClinicShift } = useAuth();

  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isCreateNewVisitDialogOpen, setIsCreateNewVisitDialogOpen] =
    useState(false); // NEW

  // Data for "Create New Visit for Patient" Dialog (similar to reassign, but might have different filtering for target shifts)
  const {
    data: availableDoctorShiftsForNewVisit,
    isLoading: isLoadingShiftsForNewVisit,
  } = useQuery<DoctorShift[], Error>({
    queryKey: [
      "activeDoctorShiftsForNewVisit",
      currentUser?.id,
      currentClinicShift?.id,
    ],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id), // Fetch active shifts
    enabled: isCreateNewVisitDialogOpen,
  });

  const targetShiftOptionsForNewVisit = useMemo(() => {
    return availableDoctorShiftsForNewVisit?.filter(() => true) || [];
  }, [availableDoctorShiftsForNewVisit, currentUser?.id]);

  // Removed status update mutation (unused)

  // Removed unused handleStatusChange
  const [isClickAnimating, setIsClickAnimating] = useState(false);
  const handleCardClick = () => {
    // Trigger scale animation for 0.5s
    setIsClickAnimating(true);
    setTimeout(() => setIsClickAnimating(false), 500);
    onSelect(visit.patient, visit.id);
  };

  const handleProfileButtonClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onProfileClick(visit);
  };

  const queueNumberOrVisitId = visit.number || visit.id;

  // Data for "Copy to Shift" Dialog
  const { data: availableDoctorShifts, isLoading: isLoadingShifts } = useQuery<
    DoctorShift[],
    Error
  >({
    queryKey: [
      "activeDoctorShiftsForCopy",
      currentUser?.id,
      currentClinicShift?.id,
    ],
    queryFn: () => {
      if (!currentClinicShift?.id) {
        return Promise.resolve([]);
      }
      return getActiveDoctorShifts(currentClinicShift.id);
    },
    enabled: isCopyDialogOpen && !!currentClinicShift?.id, // Only run when dialog is open AND we have a clinic shift ID
  });

  // console.log('Query State:', {
  //   isCopyDialogOpen,
  //   currentClinicShiftId: currentClinicShift?.id,
  //   isEnabled: isCopyDialogOpen && !!currentClinicShift?.id,
  //   isLoading: isLoadingShifts,
  //   data: availableDoctorShifts
  // });

  const targetShiftOptions = useMemo(() => {
    return availableDoctorShifts?.filter(() => true) || [];
  }, [availableDoctorShifts, visit.doctor?.id, visit.doctor_shift_id, currentUser?.id]);

  const handleCopyToShiftSuccess = () => {
    setIsCopyDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["activePatients"] });
    toast.success("تم نسخ الزيارة إلى النوبة بنجاح");
  };

  const handleWhatsAppSent = () => {
    setIsWhatsAppDialogOpen(false);
  };

  // Cleanup function to restore pointer-events
  const cleanupBodyPointerEvents = () => {
    document.body.style.removeProperty("pointer-events");
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupBodyPointerEvents();
    };
  }, []);

  const handleDialogOpenChange = (
    isOpen: boolean,
    setDialogState: (open: boolean) => void
  ) => {
    setDialogState(isOpen);
    if (!isOpen) {
      // Give time for animations to complete before removing overlay
      setTimeout(() => {
        const contextMenuOverlay = document.querySelector(
          "[data-radix-popper-content-wrapper]"
        );
        if (contextMenuOverlay instanceof HTMLElement) {
          contextMenuOverlay.remove();
        }
      }, 100);
    }
  };

  const handleContextMenuItemClick = (action: () => void) => {
    // Immediately restore pointer-events when opening a dialog
    cleanupBodyPointerEvents();
    action();
  };
  const handleNewVisitCreated = () => {
    setIsCreateNewVisitDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["activePatients"] }); // Refresh patient lists
    toast.success("تم إنشاء زيارة جديدة للمريض بنجاح");
  };
  console.log('visit in active patient card', visit);
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card
            className={cn(
              "hover:shadow-lg transition-transform duration-500 cursor-pointer flex flex-row items-center px-3 py-2 h-[52px] w-[310px]",
              isSelected
                ? "ring-2 ring-primary shadow-lg bg-primary/10"
                : `bg-card ring-1 ring-transparent hover:ring-slate-300 ${visit.company ? "ring-pink-400" : ""}`
            , isClickAnimating ? "scale-105" : undefined)}
            data-selected-in-workspace={(selectedPatientVisitIdInWorkspace === visit.id).toString()}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleCardClick();
            }}
            aria-selected={isSelected}
            aria-label={`اختيار ${visit.patient.name}, رقم ${queueNumberOrVisitId}`}
          >
            {/* Queue number or Heart for company patients */}
            {visit.company ? (
              <div
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center ltr:mr-3 rtl:ml-3 " 
                title={`رقم : ${queueNumberOrVisitId}`}
              >
                {/* Custom heart shape with solid background */}
                <div 
                  className="relative w-8 h-8 flex items-center justify-center border-2 border-pink-400 rounded"
                  style={{
                    background: 'linear-gradient(45deg, #ec4899, #f472b6)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                >
                  <span className="text-white text-xs font-bold z-10">
                    {queueNumberOrVisitId}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-white text-sm font-bold shadow ltr:mr-3 rtl:ml-3",
                  visit.balance_due > 0 ? "bg-red-500" : "bg-green-500"
                  // getStatusColor(visit.status)
                )}
                title={`رقم : ${queueNumberOrVisitId}`}
              >
                {queueNumberOrVisitId}
              </div>
            )}

            {/* Patient info and status */}
            <div className="flex-grow min-w-0 ltr:mr-2 rtl:ml-2">
              <p
                className="text-sm font-semibold text-slate-800 leading-tight truncate"
                title={visit.patient.name}
              >
                {visit.patient.name}
              </p>
              <div className="flex items-center justify-between mt-1">
                {/* Company indicator removed since it's now shown as the main badge */}
              </div>
            </div>

            {/* Profile button with badge */}
            <Badge
              badgeContent={
                visit.requested_services_count > 0
                  ? visit.requested_services_count
                  : null
              }
              color="secondary"
              anchorOrigin={{ vertical: "top", horizontal: "left" }}
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.5rem",
                  height: "12px",
                  minWidth: "12px",
                  padding: "0 3px",
                  ...(visit.requested_services_count > 0
                    ? {
                        backgroundColor:
                          visit.status === "payment_pending" ? "#ef4444" : "#16a34a",
                        color: "#fff",
                      }
                    : {}),
                },
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full flex-shrink-0 p-0"
                onClick={handleProfileButtonClick}
                title="عرض الملف الشخصي"
                aria-label={`عرض الملف الشخصي لـ ${visit.patient.name}`}
              >
                <UserCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Button>
            </Badge>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem
            onClick={() =>
              handleContextMenuItemClick(() => setIsCopyDialogOpen(true))
            }
          >
            <Copy className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            نسخ إلى نوبة
            {isLoadingShifts && (
              <Loader2 className="ltr:ml-auto rtl:mr-auto h-3 w-3 animate-spin" />
            )}
          </ContextMenuItem>
          {/* NEW CONTEXT MENU ITEM */}
          <ContextMenuItem
            onClick={() =>
              handleContextMenuItemClick(() =>
                setIsCreateNewVisitDialogOpen(true)
              )
            }
          >
            <UserPlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            إنشاء زيارة جديدة للمريض
            {isLoadingShiftsForNewVisit && (
              <Loader2 className="ltr:ml-auto rtl:mr-auto h-3 w-3 animate-spin" />
            )}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              handleContextMenuItemClick(() => setIsWhatsAppDialogOpen(true))
            }
          >
            <MessageSquare className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            إرسال واتساب
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() =>
              handleContextMenuItemClick(() => setIsHistoryDialogOpen(true))
            }
          >
            <History className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            عرض التاريخ
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <CopyVisitToShiftDialog
        isOpen={isCopyDialogOpen}
        onOpenChange={(open) =>
          handleDialogOpenChange(open, setIsCopyDialogOpen)
        }
        visitToCopy={visit}
        targetShiftOptions={targetShiftOptions}
        isLoadingTargetShifts={isLoadingShifts}
        onSuccess={handleCopyToShiftSuccess}
      />
      {/* NEW Dialog for Creating a New Visit based on current patient */}
      <CreateNewVisitForPatientDialog
        isOpen={isCreateNewVisitDialogOpen}
        onOpenChange={setIsCreateNewVisitDialogOpen}
        sourcePatient={visit.patient} // Pass the patient data to be copied
        targetShiftOptions={targetShiftOptionsForNewVisit}
        isLoadingTargetShifts={isLoadingShiftsForNewVisit}
        onSuccess={handleNewVisitCreated}
      />

      <SendWhatsAppDialog
        isOpen={isWhatsAppDialogOpen}
        onOpenChange={(open) =>
          handleDialogOpenChange(open, setIsWhatsAppDialogOpen)
        }
        patient={visit.patient}
        visitId={visit.id}
        onMessageSent={handleWhatsAppSent}
      />
      <PatientVisitHistoryDialog
        isOpen={isHistoryDialogOpen}
        onOpenChange={(open) =>
          handleDialogOpenChange(open, setIsHistoryDialogOpen)
        }
        patientId={visit.patient.id}
      />
    </>
  );
};

export default ActivePatientCard;
