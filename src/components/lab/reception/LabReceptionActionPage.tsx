// src/components/lab/reception/LabReceptionActionPage.tsx
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    UserPlus, 
    LayoutGrid, 
    Calculator,
    Eye,
    ListChecks,
    Printer,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Import the dialogs that will be opened by the new buttons
import LabUserShiftSummaryDialog from './LabUserShiftSummaryDialog';

interface LabReceptionActionPageProps {
  isFormVisible: boolean;
  onToggleView: () => void;
  onOpenDoctorFinder: () => void; // Parent (LabReceptionPage) will handle the DoctorFinderDialog visibility
  onOpenPriceList: () => void;
  activeVisitId?: number | null;
  hasLabRequests?: boolean;
  onPrintInvoice?: () => void;
}

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
  
  // State to control the visibility of the user's income summary dialog
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="bg-card border-border p-2 flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden h-full shadow-md border-l"
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
                  ? 'عرض طابور المرضى'
                  : 'تسجيل مريض جديد'
              }
            >
              {isFormVisible ? (
                <LayoutGrid className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>
              {isFormVisible
                ? 'عرض طابور المرضى'
                : 'تسجيل مريض جديد'}
            </p>
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1" />

        {/* Button: Print Invoice (visible only when a patient is selected and has lab requests) */}
        {activeVisitId && hasLabRequests && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-11 h-11"
                onClick={() => onPrintInvoice && onPrintInvoice()}
                aria-label="طباعة فاتورة المختبر"
              >
                <Printer className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>طباعة فاتورة المختبر</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Button: Price list of main tests */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-11 h-11"
              onClick={onOpenPriceList}
              aria-label="قائمة أسعار التحاليل"
            >
              <ListChecks className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>قائمة أسعار التحاليل</p>
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1" />

        {/* Button 3 (Eye): Open Doctor Finder to filter the queue */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-11 h-11" 
                    onClick={() => {
                        console.log('Eye button clicked');
                        onOpenDoctorFinder();
                    }} 
                    aria-label="فلترة حسب الطبيب"
                >
                    <Eye className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>فلترة حسب الطبيب</p>
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