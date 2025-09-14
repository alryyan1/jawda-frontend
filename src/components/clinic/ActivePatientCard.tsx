// src/components/clinic/ActivePatientCard.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCircle,
  Loader2,
  Heart,
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

import type { Patient } from "@/types/patients";
import type { DoctorShift } from "@/types/doctors";
import { updateDoctorVisitStatus } from "@/services/visitService";
import { getActiveDoctorShifts } from "@/services/clinicService";
import type { Company } from "@/types/companies";
import { useAuth } from "@/contexts/AuthContext";

import CopyVisitToShiftDialog from "./CopyVisitToShiftDialog";
import SendWhatsAppDialog from "./SendWhatsAppDialog";
import PatientVisitHistoryDialog from "./PatientVisitHistoryDialog";
import CreateNewVisitForPatientDialog from "./CreateNewVisitForPatientDialog";
import Badge from "@mui/material/Badge"; // MUI Badge
import type { DoctorVisit } from "@/types/visits";

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

interface ActivePatientVisit {
  id: number;
  status: VisitStatus;
  patient: Patient;
  company?: Company;
  doctor?: { id: number; name: string };
  doctor_shift_id?: number | null;
  queue_number?: number;
  number?: number;
  requested_services_count: number;
  created_at: string;
  updated_at: string;
}

interface PaginatedActivePatientVisitsResponse {
  data: ActivePatientVisit[];
  total: number;
  page: number;
  limit: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface ActivePatientCardProps {
  visit: ActivePatientVisit;
  isSelected: boolean;
  onSelect: (patient: Patient, visitId: number) => void;
  onProfileClick: (visit: DoctorVisit) => void;
  selectedPatientVisitIdInWorkspace: number | null;
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

const getStatusText = (status: VisitStatus): string => {
  switch (status) {
    case "waiting":
      return "في الانتظار";
    case "with_doctor":
      return "مع الطبيب";
    case "lab_pending":
      return "في انتظار المختبر";
    case "imaging_pending":
      return "في انتظار الأشعة";
    case "payment_pending":
      return "في انتظار الدفع";
    case "completed":
      return "مكتملة";
    case "cancelled":
      return "ملغية";
    case "no_show":
      return "لم يحضر";
    default:
      return status;
  }
};

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
    return (
      availableDoctorShiftsForNewVisit?.filter(
        (ds) => true // Example: any open shift of current user
        // Or: ds.status === true // Any open shift if admin
      ) || []
    );
  }, [availableDoctorShiftsForNewVisit, currentUser?.id]);

  const statusUpdateMutation = useMutation({
    mutationFn: (params: { visitId: number; status: VisitStatus }) =>
      updateDoctorVisitStatus(params.visitId, params.status),
    onSuccess: (updatedVisitData, variables) => {
      toast.success("تم تحديث حالة الزيارة بنجاح");

      // Update all active patients queries that might contain this visit
      queryClient.setQueriesData(
        { queryKey: ["activePatients"] },
        (oldData: PaginatedActivePatientVisitsResponse | undefined) => {
          if (!oldData?.data) return oldData;
          return {
            ...oldData,
            data: oldData.data.map((v: ActivePatientVisit) =>
              v.id === variables.visitId
                ? { ...v, status: variables.status }
                : v
            ),
          };
        }
      );

      // Invalidate all active patients queries to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: ["activePatients"],
      });

      // If this visit is selected in workspace, update its data too
      if (selectedPatientVisitIdInWorkspace === variables.visitId) {
        queryClient.invalidateQueries({
          queryKey: ["doctorVisit", variables.visitId],
        });
      }
    },
    onError: (error: ApiError) => {
      toast.error(
        error.response?.data?.message || "فشل في تحديث حالة الزيارة"
      );
    },
  });

  const handleStatusChange = (newStatus: VisitStatus) => {
    if (visit.status !== newStatus) {
      statusUpdateMutation.mutate({ visitId: visit.id, status: newStatus });
    }
  };

  const handleCardClick = () => onSelect(visit.patient, visit.id);

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
    return (
      availableDoctorShifts?.filter(
        (ds) => true
          // ds.user_id === currentUser?.id &&
          // ds.id !== visit.doctor_shift_id &&
          // ds.status === true
      ) || []
    );
  }, [
    availableDoctorShifts,
    visit.doctor?.id,
    visit.doctor_shift_id,
    currentUser?.id,
  ]);

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
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Card
            className={cn(
              "hover:shadow-lg transition-shadow cursor-pointer flex flex-row items-center px-3 py-2 h-[82px] w-[300px]",
              isSelected
                ? "ring-2 ring-primary shadow-lg bg-primary/10"
                : `bg-card ring-1 ring-transparent hover:ring-slate-300 ${visit.company ? "ring-pink-400" : ""}`
            )}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleCardClick();
            }}
            aria-selected={isSelected}
            aria-label={`اختيار ${visit.patient.name}, رقم ${queueNumberOrVisitId}`}
          >
            {/* Queue number */}
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-white text-sm font-bold shadow ltr:mr-3 rtl:ml-3",
                getStatusColor(visit.status)
              )}
              title={`رقم الطابور: ${queueNumberOrVisitId}`}
            >
              {queueNumberOrVisitId}
            </div>

            {/* Patient info and status */}
            <div className="flex-grow min-w-0 ltr:mr-2 rtl:ml-2">
              <p
                className="text-sm font-semibold text-slate-800 leading-tight truncate"
                title={visit.patient.name}
              >
                {visit.patient.name}
              </p>
              <div className="flex items-center justify-between mt-1">
                <div className="flex-1 relative">
                  <Select
                    value={visit.status}
                    onValueChange={handleStatusChange}
                    dir="rtl"
                    disabled={
                      statusUpdateMutation.isPending &&
                      statusUpdateMutation.variables?.visitId === visit.id
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "h-6 text-xs px-1.5 py-0 focus:ring-0 focus:ring-offset-0 border-0 focus-visible:ring-offset-0 focus-visible:ring-0 shadow-none bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted",
                        visit.status === "waiting" &&
                          "text-amber-700",
                        visit.status === "with_doctor" &&
                          "text-blue-700",
                        visit.status === "completed" &&
                          "text-green-700",
                        (visit.status === "cancelled" ||
                          visit.status === "no_show") &&
                          "text-red-700"
                      )}
                      aria-label={`تغيير حالة ${visit.patient.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                      {VISIT_STATUSES_FOR_DROPDOWN.map((statusKey) => (
                        <SelectItem
                          key={statusKey}
                          value={statusKey}
                          className="text-xs"
                        >
                          {getStatusText(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {statusUpdateMutation.isPending &&
                    statusUpdateMutation.variables?.visitId === visit.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      </div>
                    )}
                </div>
                
                {visit.company != null && (
                  <div className="flex-shrink-0 ltr:ml-1 rtl:mr-1">
                    <Heart className="h-3 w-3 text-pink-500" />
                  </div>
                )}
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
