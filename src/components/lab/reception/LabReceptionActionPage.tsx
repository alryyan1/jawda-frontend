// src/components/lab/reception/LabReceptionActionPage.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    UserPlus, 
    LayoutGrid, 
    Calculator, // Icon from image
    Eye,        // Icon from image
    WalletCards,// Placeholder for 3rd icon
    Printer     // Placeholder for 4th icon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Import the dialogs that will be opened by the new buttons
import LabUserShiftSummaryDialog from './LabUserShiftSummaryDialog';

interface LabReceptionActionPageProps {
  isFormVisible: boolean;
  onToggleView: () => void;
  onOpenDoctorFinder: () => void; // Parent (LabReceptionPage) will handle the DoctorFinderDialog visibility
}

const LabReceptionActionPage: React.FC<LabReceptionActionPageProps> = ({
  isFormVisible,
  onToggleView,
  onOpenDoctorFinder,
}) => {
  const { t, i18n } = useTranslation(['labReception', 'common']);
  const { currentClinicShift } = useAuth();
  
  // State to control the visibility of the user's income summary dialog
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
        {/* Button 1: Toggle Registration Form / Queue View */}
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

        <Separator className="my-1" />

        {/* Button 2 (Calculator): Open User's Lab Financial Summary */}
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
                     <Calculator className="h-5 w-5" />
                 </Button>
             </TooltipTrigger>
             <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
                 <p>{t('actions.myShiftIncome')}</p>
             </TooltipContent>
         </Tooltip>
        )}

        {/* Button 3 (Eye): Open Doctor Finder to filter the queue */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-11 h-11" 
                    onClick={onOpenDoctorFinder} 
                    aria-label={t('actions.filterByDoctor')}
                >
                    <Eye className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
                <p>{t('actions.filterByDoctor')}</p>
            </TooltipContent>
        </Tooltip>
        
        {/* Button 4 (Banknote): Placeholder */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-11 h-11" disabled>
                    <WalletCards className="h-5 w-5 opacity-50" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
                <p>{t('common:underDevelopment')}</p>
            </TooltipContent>
        </Tooltip>
        
        {/* Button 5 (Printer): Placeholder */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-11 h-11" disabled>
                    <Printer className="h-5 w-5 opacity-50" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'}>
                <p>{t('common:underDevelopment')}</p>
            </TooltipContent>
        </Tooltip>

      </aside>

      {/* Render the dialogs that this pane can open */}
      {currentClinicShift && (
         <LabUserShiftSummaryDialog
             isOpen={isIncomeDialogOpen}
             onOpenChange={setIsIncomeDialogOpen}
             currentClinicShiftId={currentClinicShift?.id ?? null}
         />
      )}
    </TooltipProvider>
  );
};

export default LabReceptionActionPage;