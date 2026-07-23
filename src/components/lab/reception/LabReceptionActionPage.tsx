// src/components/lab/reception/LabReceptionActionPage.tsx
import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserPlus, LayoutGrid, Eye, Printer, FileText, Globe, ListChecks, Banknote } from "lucide-react";
import { Calculate } from "@mui/icons-material";
import { Badge } from "@mui/material";

import { webUrl } from "@/pages/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useLab2LabTodayCount } from "@/hooks/useLab2LabTodayCount";

import LabUserShiftSummaryDialog from "./LabUserShiftSummaryDialog";
import OnlineLabPatientsDialog from "./OnlineLabPatientsDialog";

interface LabReceptionActionPageProps {
  isFormVisible: boolean;
  onToggleView: () => void;
  onOpenDoctorFinder: () => void;
  onOpenPriceList: () => void;
  activeVisitId?: number | null;
  hasLabRequests?: boolean;
  onPrintInvoice?: () => void;
  activeLabRequestId?: number | null;
  activeMainTestId?: number | null;
}

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "ghost" | "secondary";
}

/** Icon button with a tooltip — the single building block of the action rail. */
const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, children, variant = "ghost" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant={variant} size="icon" className="h-11 w-11" onClick={onClick} aria-label={label}>
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="left">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
);

const LabReceptionActionPage: React.FC<LabReceptionActionPageProps> = ({
  isFormVisible,
  onToggleView,
  onOpenDoctorFinder,
  onOpenPriceList,
  activeVisitId,
  hasLabRequests,
  onPrintInvoice,
}) => {
  const { currentClinicShift } = useAuth();

  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isOnlineLabPatientsDialogOpen, setIsOnlineLabPatientsDialogOpen] = useState(false);

  // Realtime count of today's lab2lab patients, shown as a badge on the Globe button
  const lab2LabTodayCount = useLab2LabTodayCount();

  const openLabShiftReport = () => {
    const params = new URLSearchParams();
    if (currentClinicShift?.id) params.append("shift", String(currentClinicShift.id));
    window.open(`${webUrl}reports/lab-shift/pdf?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        aria-label="إجراءات الاستقبال"
        className="flex h-full w-[60px] shrink-0 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card p-2 shadow-sm"
      >
        <ActionButton
          label={isFormVisible ? "عرض المرضى" : "تسجيل مريض جديد"}
          onClick={onToggleView}
          variant={isFormVisible ? "secondary" : "ghost"}
        >
          {isFormVisible ? <LayoutGrid className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
        </ActionButton>

        {currentClinicShift && (
          <ActionButton label="ملخص دخل المستخدم" onClick={() => setIsIncomeDialogOpen(true)}>
            <Calculate className="h-5 w-5" />
          </ActionButton>
        )}

        {activeVisitId && hasLabRequests && (
          <ActionButton label="طباعة فاتورة المختبر" onClick={() => onPrintInvoice?.()}>
            <Printer className="h-5 w-5" />
          </ActionButton>
        )}

        {currentClinicShift && (
          <ActionButton label="تقرير وردية المختبر" onClick={openLabShiftReport}>
            <FileText className="h-5 w-5" />
          </ActionButton>
        )}

        <ActionButton label="قائمة الاسعار" onClick={onOpenPriceList}>
          <ListChecks className="h-5 w-5" />
        </ActionButton>

        <ActionButton label="فلترة حسب الطبيب" onClick={onOpenDoctorFinder}>
          <Eye className="h-5 w-5" />
        </ActionButton>

        <ActionButton
          label="الفئات"
          onClick={() => window.open(`./cash-reconciliation`, "_blank", "noopener,noreferrer")}
        >
          <Banknote className="h-5 w-5" />
        </ActionButton>

        <Separator className="my-1" />

        <ActionButton label="المرضى من المختبرات الأخرى" onClick={() => setIsOnlineLabPatientsDialogOpen(true)}>
          <Badge badgeContent={lab2LabTodayCount} color="error" max={99}>
            <Globe className="h-5 w-5" />
          </Badge>
        </ActionButton>
      </aside>

      {currentClinicShift && (
        <LabUserShiftSummaryDialog
          isOpen={isIncomeDialogOpen}
          onOpenChange={setIsIncomeDialogOpen}
          currentClinicShiftId={currentClinicShift?.id ?? null}
        />
      )}

      <OnlineLabPatientsDialog isOpen={isOnlineLabPatientsDialogOpen} onOpenChange={setIsOnlineLabPatientsDialogOpen} />
    </TooltipProvider>
  );
};

export default LabReceptionActionPage;
