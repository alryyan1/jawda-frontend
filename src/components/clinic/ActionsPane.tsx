// src/components/clinic/ActionsPane.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserPlus,
  LayoutGrid,
  BriefcaseMedical,
  CalendarClock,
  WalletCards,
  ReceiptText,
  BarChart3,
  FilePieChart,
  UserSearch,
} from "lucide-react"; // UsersRound for manage doctor shifts
import ManageDoctorShiftsDialog from "./ManageDoctorShiftsDialog";
import { cn } from "@/lib/utils";
import UserShiftIncomeDialog from "./UserShiftIncomeDialog";
import AddCostDialog from "./AddCostDialog";
import { Separator } from "@radix-ui/react-separator";
import { useAuth } from "@/contexts/AuthContext";
import ShiftSummaryDialog from "./ShiftSummaryDialog"; // Make sure this component exists
import DoctorShiftFinancialReviewDialog from "./dialogs/DoctorShiftFinancialReviewDialog";
import DoctorFinderDialog from "./dialogs/DoctorFinderDialog";
import type { DoctorShift } from "@/types/doctors";
 
interface ActionsPaneProps {
  showRegistrationForm: boolean;
  onToggleRegistrationForm: () => void;
  onDoctorShiftSelectedFromFinder: (shift: DoctorShift) => void;
  onOpenDoctorFinderDialog: () => void; // NEW PROP to open the dialog controlled by ClinicPage

}

const ActionsPane: React.FC<ActionsPaneProps> = ({
  showRegistrationForm,
  onToggleRegistrationForm,
  onDoctorShiftSelectedFromFinder,
  onOpenDoctorFinderDialog, // NEW PROP to open the dialog controlled by ClinicPage
}) => {
  const { t, i18n } = useTranslation(["clinic", "common", "finances"]);
  // const { can } = useAuthorization(); // For permission checks
  const { currentClinicShift, isLoading } = useAuth();
  console.log('currentClinicShift', currentClinicShift ,'in actions pane');
  // Placeholder permissions
  const canRegisterPatient = true; // can('create patients')
  const canManageDoctorShifts = true; // can('manage doctor_shifts')
  const canViewOwnShiftIncome = true; // can('view own shift income')
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const canRecordCosts = true; // can('record costs')
  const [showShiftSummaryDialog, setShowShiftSummaryDialog] = useState(false);
  const [isFinancialReviewDialogOpen, setIsFinancialReviewDialogOpen] = useState(false);
  const [isDoctorFinderOpen, setIsDoctorFinderOpen] = useState(false); // NEW
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "bg-card border-border p-2 flex flex-col items-center space-y-2 overflow-y-auto h-full shadow-md",
          i18n.dir() === "rtl" ? "border-l" : "border-r"
        )}
        // style={{width: 'calc(100vw / 11)'}} // Smaller width for icon-only buttons
        style={{ width: "60px" }} // Fixed small width for icons
      >
        {/* <h3 className="text-xs font-medium text-muted-foreground pt-1 self-center">
          {t('clinic:actionsPane.titleShort', "Actions")}
        </h3> */}
        {/* <Separator className="my-1" /> */}

        {canRegisterPatient && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showRegistrationForm ? "secondary" : "ghost"}
                size="icon"
                className="w-11 h-11"
                onClick={onToggleRegistrationForm}
                aria-label={
                  showRegistrationForm
                    ? t("clinic:actionsPane.viewPatientWorkspace")
                    : t("clinic:actionsPane.registerNewPatient")
                }
              >
                {showRegistrationForm ? (
                  <LayoutGrid className="h-5 w-5" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"}>
              <p>
                {showRegistrationForm
                  ? t("clinic:actionsPane.viewPatientWorkspace")
                  : t("clinic:actionsPane.registerNewPatient")}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
  {canViewOwnShiftIncome && currentClinicShift && ( // Only show if a clinic shift is active
         <Tooltip>
             <TooltipTrigger asChild>
                 <Button 
                     variant="ghost" 
                     size="icon" 
                     title={t('clinic:actionsPane.myShiftIncome')}
                     className="w-11 h-11" 
                     onClick={() => setIsIncomeDialogOpen(true)}
                     aria-label={t('clinic:actionsPane.myShiftIncome')}
                 >
                     <WalletCards className="h-5 w-5" />
                 </Button>
             </TooltipTrigger>
             <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
                 <p>{t('clinic:actionsPane.myShiftIncome')}</p>
             </TooltipContent>
         </Tooltip>
        )}
         {/* NEW DOCTOR FINDER BUTTON */}
         <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-11 h-11" 
                    onClick={onOpenDoctorFinderDialog} // Use the prop here
                    aria-label={t('clinic:actionsPane.findDoctor')}
                >
                    <UserSearch className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
                <p>{t('clinic:actionsPane.findDoctor')}</p>
            </TooltipContent>
        </Tooltip>
        {canManageDoctorShifts && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block"> {/* Wrap in span to prevent button nesting */}
                <ManageDoctorShiftsDialog
                  currentClinicShiftId={currentClinicShift?.id ?? null}
                  triggerButton={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-11 h-11"
                      aria-label={t("clinic:actionsPane.manageDoctorShifts")}
                    >
                      <CalendarClock className="h-5 w-5" />
                    </Button>
                  }
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"}>
              <p>{t("clinic:actionsPane.manageDoctorShifts")}</p>
            </TooltipContent>
          </Tooltip>
        )}
 <Separator className="my-1" />

{canRecordCosts && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-block"> {/* Wrap in span to prevent button nesting */}
        <AddCostDialog
          currentOpenClinicShift={currentClinicShift}
          triggerButton={
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-11 h-11" 
              aria-label={t('finances:costs.addButton')} 
              disabled={!currentClinicShift || isLoading}
            >
              <ReceiptText className="h-5 w-5" />
            </Button>
          }
          onCostAdded={() => {
            // Potentially invalidate dashboard summary or other relevant queries
          }}
        />
      </span>
    </TooltipTrigger>
    <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
      <p>{t('finances:costs.addButton')}</p>
    </TooltipContent>
  </Tooltip>
)}

<Separator className="my-1" />

{currentClinicShift && ( // Show button only if a shift is active/known
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon" 
        className="w-11 h-11" 
        onClick={() => setShowShiftSummaryDialog(true)}
        aria-label={t('clinic:actionsPane.viewShiftSummary')}
      >
        <BarChart3 className="h-5 w-5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
      <p>{t('clinic:actionsPane.viewShiftSummary')}</p>
    </TooltipContent>
  </Tooltip>
)}
<Separator className="my-1" />
        
        {/* Button to open the new dialog */}
        {/* Add permission check: can('review doctor_shift_financials') */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-11 h-11" 
                    onClick={() => setIsFinancialReviewDialogOpen(true)}
                    aria-label={t('clinic:actionsPane.financialReview')}
                >
                    <FilePieChart className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
            <p>{t('clinic:actionsPane.financialReview')}</p>
            </TooltipContent>
        </Tooltip>
        {/* Example other action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-11 h-11" disabled>
              <BriefcaseMedical className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"}>
            <p>{t("common:pharmacy", "Pharmacy")} (Скоро)</p>{" "}
            {/* (Coming soon) */}
          </TooltipContent>
        </Tooltip>

        {/* More actions can be added here */}
      </aside>
      
      {currentClinicShift && ( // Only render dialog if there's a shift context
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
    
    </TooltipProvider>
  );
};

export default ActionsPane;
