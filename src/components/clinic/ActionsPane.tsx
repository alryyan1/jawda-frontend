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
  faUsers,
  faUserPlus,
  faAddressBook,
  faIdBadge,
  faClockRotateLeft,
  faGlobe,
  faLock,
  faUserDoctor
} from "@fortawesome/free-solid-svg-icons";
import ManageDoctorShiftsDialog from "./ManageDoctorShiftsDialog";
import { useAuth } from "@/contexts/AuthContext";
import ShiftSummaryDialog from "./ShiftSummaryDialog";
import type { DoctorShift } from "@/types/doctors";
import { webUrl } from "@/pages/constants";
 
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
              const url = `${webUrl}reports/clinic-shift-summary/pdf`;
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
      
    </>
  );
};

export default ActionsPane;
