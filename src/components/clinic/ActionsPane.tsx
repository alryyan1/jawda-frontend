// src/components/clinic/ActionsPane.tsx
import React, { useState } from "react";
import {
  Tooltip,
  Divider,
  Box,
  IconButton,
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
  faUserDoctor
} from "@fortawesome/free-solid-svg-icons";
import ManageDoctorShiftsDialog from "./ManageDoctorShiftsDialog";
import DoctorCredits from "./DoctorCredits";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import ShiftSummaryDialog from "./ShiftSummaryDialog";
import type { DoctorShift } from "@/types/doctors";
import { webUrl } from "@/pages/constants";
import dayjs from "dayjs";
 
interface ActionsPaneProps {
  showRegistrationForm: boolean;
  onToggleRegistrationForm: () => void;
  onDoctorShiftSelectedFromFinder: (shift: DoctorShift) => void;
}

const ActionsPane: React.FC<ActionsPaneProps> = ({
  showRegistrationForm,
  onToggleRegistrationForm,
}) => {
  const { currentClinicShift } = useAuth();
    // Placeholder permissions
  const canRegisterPatient = true;
  const canManageDoctorShifts = true;
  const [showShiftSummaryDialog, setShowShiftSummaryDialog] = useState(false);
  const [isDoctorCreditsOpen, setIsDoctorCreditsOpen] = useState(false);
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
       <Tooltip title="التقرير العام" placement="left">
          <IconButton
            onClick={() => {
              const url = `${webUrl}reports/doctor-shifts/pdf?shift_id=${currentClinicShift?.id}&date_from=${dayjs().format('YYYY-MM-DD')}&date_to=${dayjs().format('YYYY-MM-DD')}&user_opened=${currentClinicShift?.user_opened}`;
              window.open(url, '_blank', 'noopener,noreferrer');
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            sx={{ width: 44, height: 44, color: "success.main" }}
          >
            <FontAwesomeIcon icon={faSitemap} />
          </IconButton>
        </Tooltip>
        
        {canRegisterPatient && (
          <Tooltip title={showRegistrationForm ? "عرض مساحة العمل للمرضى" : "تسجيل مريض جديد"} placement="left">
            <IconButton
              color={showRegistrationForm ? "primary" : "default"}
              onClick={onToggleRegistrationForm}
              sx={{ width: 44, height: 44 }}
            >
              {showRegistrationForm ? <LayoutGrid /> : <FontAwesomeIcon icon={faUserPlus} />}
            </IconButton>
          </Tooltip>
        )}
            {canManageDoctorShifts && (
          <Tooltip title="إدارة نوبات الأطباء" placement="left">
            <ManageDoctorShiftsDialog
              currentClinicShiftId={currentClinicShift?.id ?? null}
              currentUserId={1} // TODO: Get from auth context when available
              triggerButton={
                <IconButton sx={{ width: 44, height: 44 }}>
                  <FontAwesomeIcon icon={faUserDoctor} />
                </IconButton>
              }
            />
          </Tooltip>
        )}
        {/* Doctor Credits Button */}
        <Tooltip title="استحقاقات الأطباء" placement="left">
          <IconButton
            onClick={() => setIsDoctorCreditsOpen(true)}
            sx={{ width: 44, height: 44, color: "info.main" }}
            aria-label="استحقاقات الأطباء"
          >
            <BriefcaseMedical />
          </IconButton>
        </Tooltip>
        
        
    
        <Tooltip title="تحديث" placement="left">
          <IconButton
            onClick={() => {/* TODO: Add refresh functionality */}}
            sx={{ width: 44, height: 44, color: "success.main" }}
          >
            <FontAwesomeIcon icon={faClockRotateLeft} />
          </IconButton>
        </Tooltip>
        
      
        
   
     
        <Divider sx={{ width: "100%", my: 1 }} />
          <Tooltip title="الحجوزات اونلاين " placement="left">
          <IconButton
            onClick={() => {/* TODO: Add language/settings functionality */}}
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

      {/* Doctor Credits Dialog */}
      <Dialog open={isDoctorCreditsOpen} onOpenChange={setIsDoctorCreditsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>استحقاقات الأطباء</DialogTitle>
          </DialogHeader>
          <DoctorCredits />
        </DialogContent>
      </Dialog>
      
    </>
  );
};

export default ActionsPane;
