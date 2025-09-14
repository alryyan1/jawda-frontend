// src/components/clinic/ActionsPane.tsx
import React, { useState } from "react";
import {
  Tooltip,
  Divider,
  Box,
  IconButton,
} from "@mui/material";
import {
  PersonAdd as UserPlus,
  GridView as LayoutGrid,
  MedicalServices as BriefcaseMedical,
  Schedule as CalendarClock,
  PieChart as FilePieChart,
  PersonSearch as UserSearch,
  AttachMoney as Banknote,
} from "@mui/icons-material";
import ManageDoctorShiftsDialog from "./ManageDoctorShiftsDialog";
import UserShiftIncomeDialog from "./UserShiftIncomeDialog";
import { useAuth } from "@/contexts/AuthContext";
import ShiftSummaryDialog from "./ShiftSummaryDialog";
import DoctorShiftFinancialReviewDialog from "./dialogs/DoctorShiftFinancialReviewDialog";
import type { DoctorShift } from "@/types/doctors";
 
interface ActionsPaneProps {
  showRegistrationForm: boolean;
  onToggleRegistrationForm: () => void;
  onDoctorShiftSelectedFromFinder: (shift: DoctorShift) => void;
  onOpenDoctorFinderDialog: () => void;
}

const ActionsPane: React.FC<ActionsPaneProps> = ({
  showRegistrationForm,
  onToggleRegistrationForm,
  onOpenDoctorFinderDialog,
}) => {
  const { currentClinicShift } = useAuth();
  
  // Placeholder permissions
  const canRegisterPatient = true;
  const canManageDoctorShifts = true;
  const canViewOwnShiftIncome = true;
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [showShiftSummaryDialog, setShowShiftSummaryDialog] = useState(false);
  const [isFinancialReviewDialogOpen, setIsFinancialReviewDialogOpen] = useState(false);
  return (
    <>
    <Box
      sx={{
        width: "60px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        padding: 1,
        backgroundColor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
        overflowY: "auto",
        boxShadow: 1,
        direction: "rtl", // Arabic RTL direction
      }}
    >
        {canRegisterPatient && (
          <Tooltip title={showRegistrationForm ? "عرض مساحة العمل للمرضى" : "تسجيل مريض جديد"} placement="left">
            <IconButton
              color={showRegistrationForm ? "primary" : "default"}
              onClick={onToggleRegistrationForm}
              sx={{ width: 44, height: 44 }}
            >
              {showRegistrationForm ? <LayoutGrid /> : <UserPlus />}
            </IconButton>
          </Tooltip>
        )}
        {canViewOwnShiftIncome && currentClinicShift && (
          <Tooltip title="دخل نوبتي" placement="left">
            <IconButton
              onClick={() => setIsIncomeDialogOpen(true)}
              sx={{ width: 44, height: 44 }}
            >
              <Banknote />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="البحث عن طبيب" placement="left">
          <IconButton
            onClick={onOpenDoctorFinderDialog}
            sx={{ width: 44, height: 44 }}
          >
            <UserSearch />
          </IconButton>
        </Tooltip>
        {canManageDoctorShifts && (
          <Tooltip title="إدارة نوبات الأطباء" placement="left">
            <ManageDoctorShiftsDialog
              currentClinicShiftId={currentClinicShift?.id ?? null}
              triggerButton={
                <IconButton sx={{ width: 44, height: 44 }}>
                  <CalendarClock />
                </IconButton>
              }
            />
          </Tooltip>
        )}
        <Divider sx={{ width: "100%", my: 1 }} />
        
        <Tooltip title="المراجعة المالية" placement="left">
          <IconButton
            onClick={() => setIsFinancialReviewDialogOpen(true)}
            sx={{ width: 44, height: 44 }}
          >
            <FilePieChart />
          </IconButton>
        </Tooltip>
        <Tooltip title="الصيدلية (قريباً)" placement="left">
          <IconButton disabled sx={{ width: 44, height: 44 }}>
            <BriefcaseMedical />
          </IconButton>
        </Tooltip>
      </Box>
      
      {currentClinicShift && (
        <UserShiftIncomeDialog
          isOpen={isIncomeDialogOpen}
          onOpenChange={setIsIncomeDialogOpen}
          currentClinicShiftId={currentClinicShift?.id ?? null}
        />
      )}

      {currentClinicShift && (
        <ShiftSummaryDialog
          isOpen={showShiftSummaryDialog}
          onOpenChange={setShowShiftSummaryDialog}
          shift={currentClinicShift}
        />
      )}
      
      <DoctorShiftFinancialReviewDialog
        isOpen={isFinancialReviewDialogOpen}
        onOpenChange={setIsFinancialReviewDialogOpen}
      />
    </>
  );
};

export default ActionsPane;
