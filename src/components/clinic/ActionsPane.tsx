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
  PersonSearch as UserSearch,
  AttachMoney as Banknote,
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
import UserShiftIncomeDialog from "./UserShiftIncomeDialog";
import { useAuth } from "@/contexts/AuthContext";
import ShiftSummaryDialog from "./ShiftSummaryDialog";
import type { DoctorShift } from "@/types/doctors";
import { webUrl } from "@/pages/constants";
 
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
        
        {/* New icon buttons from the image */}
        <Tooltip title="الهيكل التنظيمي" placement="left">
          <IconButton
            onClick={() => {
              window.location.href = `${webUrl}reports/clinic-shift-summary/pdf`;
            }}
            sx={{ width: 44, height: 44, color: "success.main" }}
          >
            <FontAwesomeIcon icon={faSitemap} />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="الأطباء" placement="left">
          <IconButton
            onClick={() => {/* TODO: Add doctors management functionality */}}
            sx={{ width: 44, height: 44 }}
          >
            <FontAwesomeIcon icon={faUsers} />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="دفتر العناوين" placement="left">
          <IconButton
            onClick={() => {/* TODO: Add contacts functionality */}}
            sx={{ width: 44, height: 44 }}
          >
            <FontAwesomeIcon icon={faAddressBook} />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="بطاقات الهوية" placement="left">
          <IconButton
            onClick={() => {/* TODO: Add ID cards functionality */}}
            sx={{ width: 44, height: 44 }}
          >
            <FontAwesomeIcon icon={faIdBadge} />
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
        
        <Tooltip title="اللغة والإعدادات" placement="left">
          <IconButton
            onClick={() => {/* TODO: Add language/settings functionality */}}
            sx={{ width: 44, height: 44, color: "secondary.main" }}
          >
            <FontAwesomeIcon icon={faGlobe} />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="الأمان والصلاحيات" placement="left">
          <IconButton
            onClick={() => {/* TODO: Add security/permissions functionality */}}
            sx={{ width: 44, height: 44, color: "error.main" }}
          >
            <FontAwesomeIcon icon={faLock} />
          </IconButton>
        </Tooltip>
     
        <Divider sx={{ width: "100%", my: 1 }} />
        
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
      
    </>
  );
};

export default ActionsPane;
