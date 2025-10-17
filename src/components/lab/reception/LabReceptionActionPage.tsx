// src/components/lab/reception/LabReceptionActionPage.tsx
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    UserPlus, 
    LayoutGrid, 
    Eye,
    Printer,
    FileText,
    Globe,
    Loader2,
    ListChecks,
    Banknote,
    Images,
} from 'lucide-react';
import { webUrl } from '@/pages/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/services/api';

// Import the dialogs that will be opened by the new buttons
import LabUserShiftSummaryDialog from './LabUserShiftSummaryDialog';
import OnlineLabPatientsDialog from './OnlineLabPatientsDialog';
import BankakGallery from '../../gallery/BankakGallery';
import { Calculate } from '@mui/icons-material';

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
  
  // State to control the visibility of the bankak gallery dialog
  const [isBankakGalleryOpen, setIsBankakGalleryOpen] = useState(false);

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
                  ? 'عرض  المرضى'
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
                ? 'عرض  المرضى'
                : 'تسجيل مريض جديد'}
            </p>
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1" />

        {/* Button: Open Lab User Income Summary Dialog */}
        {currentClinicShift && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-11 h-11"
                onClick={() => setIsIncomeDialogOpen(true)}
                aria-label="ملخص دخل المستخدم"
              >
                <Calculate className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>ملخص دخل المستخدم</p>
            </TooltipContent>
          </Tooltip>
        )}

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

        {/* Button: Open Lab Shift Report PDF in new tab */}
        {currentClinicShift && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-11 h-11"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (currentClinicShift?.id) params.append('shift', String(currentClinicShift.id));
                  const url = `${webUrl}reports/lab-shift/pdf?${params.toString()}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                aria-label="تقرير وردية المختبر"
              >
                <FileText className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>تقرير وردية المختبر</p>
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
         
                onOpenPriceList();
             
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
        {/* //cash reconciliation */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                onClick={() => {
                    console.log('Calculator button clicked');
                   window.open(`./cash-reconciliation`, '_blank', 'noopener,noreferrer');
                }}
                    variant="ghost" 
                    size="icon" 
                    className="w-11 h-11" 
                >
                    <Banknote className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>الفئات  </p>
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

        <Separator className="my-1" />

        {/* Button: Bankak Gallery */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-11 h-11" 
                    onClick={() => {
                        console.log('Bankak Gallery button clicked');
                        setIsBankakGalleryOpen(true);
                    }} 
                    aria-label="بنك الصور"
                >
                    <Images className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>بنك الصور</p>
            </TooltipContent>
        </Tooltip>

      </aside>
      {/* //cash reconciliation */}


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
      
      {/* Bankak Gallery Dialog */}
      {isBankakGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-[90vw] h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">بنك الصور</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsBankakGalleryOpen(false)}
              >
                ✕
              </Button>
            </div>
            <div className="h-full overflow-auto">
              <BankakGallery />
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

export default LabReceptionActionPage;