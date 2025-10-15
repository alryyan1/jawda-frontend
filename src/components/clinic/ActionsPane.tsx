// src/components/clinic/ActionsPane.tsx
import React, { useState } from "react";
import {
  Tooltip,
  Divider,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import {
  GridView as LayoutGrid,
  MedicalServices as BriefcaseMedical,
} from "@mui/icons-material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSitemap,
  faUserPlus,
  faClockRotateLeft,
  faGlobe,
  faUserDoctor,
  faCalculator,
  faBook
} from "@fortawesome/free-solid-svg-icons";
import ManageDoctorShiftsDialog from "./ManageDoctorShiftsDialog";
import DoctorCredits from "./DoctorCredits";
// Removed shadcn dialog in favor of MUI Dialog
import { useAuth } from "@/contexts/AuthContext";
import ShiftSummaryDialog from "./ShiftSummaryDialog";
import OnlineAppointmentsDialog from "./OnlineAppointmentsDialog";
import type { DoctorShift } from "@/types/doctors";
import { webUrl } from "@/pages/constants";

interface ActionsPaneProps {
  showRegistrationForm: boolean;
  onToggleRegistrationForm: () => void;
  onDoctorShiftSelectedFromFinder: (shift: DoctorShift) => void;
  onDoctorShiftClosed?: (doctorShiftId: number) => void;
  activeDoctorShift: DoctorShift | null;
  onOpenFinancialSummary: () => void;
}

const ActionsPane: React.FC<ActionsPaneProps> = ({
  showRegistrationForm,
  onToggleRegistrationForm,
  onDoctorShiftClosed,
  activeDoctorShift,
  onOpenFinancialSummary,
}) => {
  const { currentClinicShift, user: authUser } = useAuth();
  // Placeholder permissions
  const canRegisterPatient = true;
  const canManageDoctorShifts = authUser?.user_type !== 'تامين';
  const canManageDcotorCredits = authUser?.user_type !== 'تامين';
  const canViewInsuranceReport = authUser?.user_type === 'تامين';
  const canViewGeneralReport = authUser?.user_type !== 'تامين';
  const [showShiftSummaryDialog, setShowShiftSummaryDialog] = useState(false);
  const [isDoctorCreditsOpen, setIsDoctorCreditsOpen] = useState(false);
  const [isOnlineAppointmentsOpen, setIsOnlineAppointmentsOpen] = useState(false);
  console.log(activeDoctorShift, 'activeDoctorShift')

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
        {canViewGeneralReport && <Tooltip title="التقرير العام" placement="left">
          <IconButton
            onClick={() => {
              const url = `${webUrl}reports/doctor-shifts/pdf?shift_id=${currentClinicShift?.id}&user_opened=${authUser?.id}`;
              window.open(url, '_blank', 'noopener,noreferrer');
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            sx={{ width: 44, height: 44, color: "success.main" }}
          >
            <FontAwesomeIcon icon={faSitemap} />
          </IconButton>
        </Tooltip>}

        {/* {canRegisterPatient && (
          <Tooltip title={showRegistrationForm ? "عرض مساحة العمل للمرضى" : "تسجيل مريض جديد"} placement="left">
            <IconButton
              color={showRegistrationForm ? "primary" : "default"}
              onClick={onToggleRegistrationForm}
              sx={{ width: 44, height: 44 }}
            >
              {showRegistrationForm ? <LayoutGrid /> : <FontAwesomeIcon icon={faUserPlus} />}
            </IconButton>
          </Tooltip>
        )} */}
        {canManageDoctorShifts && (
          <Tooltip title="  أطبائي" placement="left">
            <ManageDoctorShiftsDialog
              currentClinicShiftId={currentClinicShift?.id ?? null}
              currentUserId={1} // TODO: Get from auth context when available
              onDoctorShiftClosed={onDoctorShiftClosed}
              triggerButton={
                <IconButton title="أطبائي" sx={{ width: 44, height: 44 }}>
                  <FontAwesomeIcon icon={faUserDoctor} />
                </IconButton>
              }
            />
          </Tooltip>
        )}
        {/* Doctor Credits Button */}
        {canManageDcotorCredits && (
          <Tooltip title="استحقاقات الأطباء" placement="left">
            <IconButton
              onClick={() => setIsDoctorCreditsOpen(true)}
              sx={{ width: 44, height: 44, color: "info.main" }}
              aria-label="استحقاقات الأطباء"
            >
              <BriefcaseMedical />
            </IconButton>
          </Tooltip>
        )}

        {/* Financial Summary Button */}
        <Tooltip title="الملخص المالي" placement="left">
          <IconButton
            onClick={onOpenFinancialSummary}
            sx={{ width: 44, height: 44, color: "warning.main" }}
            aria-label="الملخص المالي"
          >
            <FontAwesomeIcon icon={faCalculator} />
          </IconButton>
        </Tooltip>

        {/* Insurance Report Button (visible for insurance users) */}
        {canViewInsuranceReport && (
          <Tooltip title="تقرير التأمين" placement="left">
            <IconButton
              onClick={() => {
                const url = `${webUrl}reports/insurance/pdf`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              sx={{ width: 44, height: 44, color: "primary.main" }}
              aria-label="تقرير التأمين"
            >
              <FontAwesomeIcon icon={faBook} />
            </IconButton>
          </Tooltip>
        )}







        <Tooltip title="الحجوزات الإلكترونية" placement="left">
          <IconButton
            onClick={() => setIsOnlineAppointmentsOpen(true)}
            disabled={!activeDoctorShift}
            sx={{ width: 44, height: 44, color: "secondary.main" }}
          >
            <FontAwesomeIcon icon={faGlobe} />
          </IconButton>
        </Tooltip>

      </Box>


      {currentClinicShift && (
        <ShiftSummaryDialog
          isOpen={showShiftSummaryDialog}
          onOpenChange={setShowShiftSummaryDialog}
          shift={currentClinicShift}
        />
      )}

      {/* Doctor Credits Dialog (MUI) */}
      <Dialog open={isDoctorCreditsOpen} onClose={() => setIsDoctorCreditsOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>استحقاقات الأطباء</DialogTitle>
        <DialogContent dividers>
          <DoctorCredits
            setAllMoneyUpdatedLab={() => { }}
            user={{ id: authUser?.id ?? 0, isAdmin: !!authUser?.roles?.some(r => r.name === 'admin') }}
          />
        </DialogContent>
      </Dialog>

      {/* Online Appointments Dialog */}
      <OnlineAppointmentsDialog
        isOpen={isOnlineAppointmentsOpen}
        onClose={() => setIsOnlineAppointmentsOpen(false)}
        activeDoctorShift={activeDoctorShift}
      />

    </>
  );
};

export default ActionsPane;
