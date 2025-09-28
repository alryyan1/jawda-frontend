// src/components/lab/reception/LabReceptionActionPage.tsx
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    UserPlus, 
    LayoutGrid, 
    Eye,
    ListChecks,
    Printer,
    Globe,
    Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/services/api';

// Import the dialogs that will be opened by the new buttons
import LabUserShiftSummaryDialog from './LabUserShiftSummaryDialog';
import OnlineLabPatientsDialog from './OnlineLabPatientsDialog';

interface LabReceptionActionPageProps {
  isFormVisible: boolean;
  onToggleView: () => void;
  onOpenDoctorFinder: () => void; // Parent (LabReceptionPage) will handle the DoctorFinderDialog visibility
  onOpenPriceList: () => void;
  activeVisitId?: number | null;
  hasLabRequests?: boolean;
  onPrintInvoice?: () => void;
  activeLabRequestId?: number | null;
  activeMainTestId?: number | null;
}

const LabReceptionActionPage: React.FC<LabReceptionActionPageProps> = ({
  isFormVisible,
  onToggleView,
  onOpenDoctorFinder,
  onOpenPriceList,
  activeVisitId,
  hasLabRequests,
  onPrintInvoice,
  activeLabRequestId,
  activeMainTestId,
}) => {
  const { currentClinicShift } = useAuth();
  const queryClient = useQueryClient();
  
  // State to control the visibility of the user's income summary dialog
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  
  // State to control the visibility of the online lab patients dialog
  const [isOnlineLabPatientsDialogOpen, setIsOnlineLabPatientsDialogOpen] = useState(false);

  // CBC Populate mutation
  const populateCbcMutation = useMutation({
    mutationFn: async ({ labRequestId, doctorVisitId, mainTestId }: { 
      labRequestId: number; 
      doctorVisitId: number; 
      mainTestId: number; 
    }) => {
      const response = await apiClient.post(`/labrequests/${labRequestId}/populate-cbc-from-sysmex`, {
        doctor_visit_id_for_sysmex: doctorVisitId,
        main_test_id: mainTestId
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.status) {
        toast.success(data.message || 'تم ملء نتائج CBC بنجاح');
        
        // Invalidate relevant queries to refresh the data
        queryClient.invalidateQueries({
          queryKey: ["labRequestsForVisit", activeVisitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["activeVisitForLabRequests", activeVisitId],
        });
        queryClient.invalidateQueries({
          queryKey: ["doctorVisit", activeVisitId],
        });
      } else {
        toast.error(data.message || 'فشل في ملء نتائج CBC');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'فشل في ملء نتائج CBC';
      toast.error(errorMessage);
    },
  });

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
              disabled={populateCbcMutation.isPending}
              onClick={() => {
                if (!activeVisitId) {
                  toast.error('يرجى اختيار زيارة أولاً');
                  return;
                }
                
                if (!activeLabRequestId) {
                  toast.error('يرجى اختيار طلب مختبر أولاً');
                  return;
                }
                
                if (!activeMainTestId) {
                  toast.error('يرجى اختيار فحص CBC أولاً');
                  return;
                }
                
                // Call the CBC populate API
                populateCbcMutation.mutate({
                  labRequestId: activeLabRequestId,
                  doctorVisitId: activeVisitId,
                  mainTestId: activeMainTestId
                });
              }}
              aria-label="CBC Populate"
            >
              {populateCbcMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ListChecks className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>ملء نتائج CBC من Sysmex</p>
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

        <Separator className="my-1" />

        {/* Button 4 (Globe): Open Online Lab Patients Dialog */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-11 h-11" 
                    onClick={() => {
                        console.log('Globe button clicked');
                        setIsOnlineLabPatientsDialogOpen(true);
                    }} 
                    aria-label="المرضى من المختبرات الأخرى"
                >
                    <Globe className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>المرضى من المختبرات الأخرى</p>
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
      
      <OnlineLabPatientsDialog
          isOpen={isOnlineLabPatientsDialogOpen}
          onOpenChange={setIsOnlineLabPatientsDialogOpen}
      />
    </TooltipProvider>
  );
};

export default LabReceptionActionPage;