// src/components/lab/reception/LabActionsPane.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { UserPlus, LayoutGrid, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import UserShiftIncomeDialog from '@/components/clinic/UserShiftIncomeDialog';

interface LabActionsPaneProps {
  isFormVisible: boolean; // Is the registration form currently shown?
  onToggleView: () => void; // Function to toggle between form and queue
}

const LabActionsPane: React.FC<LabActionsPaneProps> = ({
  isFormVisible,
  onToggleView,
}) => {
  const { t, i18n } = useTranslation(['labReception', 'common']);
  const { currentClinicShift } = useAuth();
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "bg-card border-border p-2 flex flex-col items-center space-y-2 overflow-y-auto h-full shadow-md",
          i18n.dir() === "rtl" ? "border-l" : "border-r"
        )}
        style={{ width: "60px" }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFormVisible ? "secondary" : "ghost"}
              size="icon"
              className="w-11 h-11"
              onClick={onToggleView}
              aria-label={
                isFormVisible
                  ? t('actions.viewPatientQueue')
                  : t('actions.registerNewPatient')
              }
            >
              {isFormVisible ? (
                <LayoutGrid className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
            <p>
              {isFormVisible
                ? t('actions.viewPatientQueue')
                : t('actions.registerNewPatient')}
            </p>
          </TooltipContent>
        </Tooltip>

        {currentClinicShift && (
         <Tooltip>
             <TooltipTrigger asChild>
                 <Button
                     variant="ghost"
                     size="icon"
                     className="w-11 h-11"
                     onClick={() => setIsIncomeDialogOpen(true)}
                     aria-label={t('actions.myShiftIncome')}
                 >
                     <WalletCards className="h-5 w-5" />
                 </Button>
             </TooltipTrigger>
             <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
                 <p>{t('actions.myShiftIncome')}</p>
             </TooltipContent>
         </Tooltip>
        )}
      </aside>

      {currentClinicShift && (
         <UserShiftIncomeDialog
             isOpen={isIncomeDialogOpen}
             onOpenChange={setIsIncomeDialogOpen}
             currentClinicShiftId={currentClinicShift?.id ?? null}
         />
      )}
    </TooltipProvider>
  );
};

export default LabActionsPane;