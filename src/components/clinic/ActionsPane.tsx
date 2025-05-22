// src/components/clinic/ActionsPane.tsx
import React from "react";
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
} from "lucide-react"; // UsersRound for manage doctor shifts
import ManageDoctorShiftsDialog from "./ManageDoctorShiftsDialog";
import { cn } from "@/lib/utils";
 
interface ActionsPaneProps {
  showRegistrationForm: boolean;
  onToggleRegistrationForm: () => void;
  currentClinicShiftId: number | null; // To pass to ManageDoctorShiftsDialog if needed
}

const ActionsPane: React.FC<ActionsPaneProps> = ({
  showRegistrationForm,
  onToggleRegistrationForm,
  currentClinicShiftId,
}) => {
  const { t, i18n } = useTranslation(["clinic", "common"]);
  // const { can } = useAuthorization(); // For permission checks

  // Placeholder permissions
  const canRegisterPatient = true; // can('create patients')
  const canManageDoctorShifts = true; // can('manage doctor_shifts')

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

        {canManageDoctorShifts && (
          <Tooltip>
            <TooltipTrigger asChild>
              <ManageDoctorShiftsDialog
                currentClinicShiftId={currentClinicShiftId}
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
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === "rtl" ? "left" : "right"}>
              <p>{t("clinic:actionsPane.manageDoctorShifts")}</p>
            </TooltipContent>
          </Tooltip>
        )}

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
    </TooltipProvider>
  );
};

export default ActionsPane;
