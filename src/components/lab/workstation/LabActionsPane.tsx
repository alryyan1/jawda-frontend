
// src/components/lab/workstation/LabActionsPane.tsx
import React, { useState } from 'react';
// استخدام نص عربي مباشر بدلاً من i18n

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBluetoothB } from '@fortawesome/free-brands-svg-icons';
import { 
  faWifi, 
  faLockOpen, 
  faCog, 
  faDownload, 
  faBars, 
  faBolt, 
  faThumbsUp, 
  faDove,
  faLock,
  faCloudUploadAlt
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

import type { LabRequest } from '@/types/visits'; // Or types/visits
import { toast } from 'sonner';
import { setLabRequestResultsToDefault } from '@/services/labWorkflowService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { populateCbcResults } from '@/services/labRequestService';
import { togglePatientResultLock } from '@/services/patientService';
import type { Patient } from '@/types/patients';
import LabAppearanceSettingsDialog from './LabAppearanceSettingsDialog';
import WhatsAppWorkAreaDialog from './dialog/WhatsAppWorkAreaDialog';
import { LisClientUrl, LisServerUrl } from '@/pages/constants';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/api';
import { updateFirestoreDocumentViaBackend } from '@/services/firestorePatientService';
import type { PatientLabQueueItem } from '@/types/labWorkflow';
import showJsonDialog from '@/lib/showJsonDialog';
// import { useAuthorization } from '@/hooks/useAuthorization';

interface LabActionsPaneProps {
  selectedLabRequest: LabRequest;
  selectedVisitId: number;
  onResultsReset: (labRequest: LabRequest) => void;
  onResultsModified: (labRequest: LabRequest) => void;
  isResultLocked: boolean;
  currentPatientData  : PatientLabQueueItem | null;
  onAppearanceSettingsChanged: () => void;
    // Add other props if actions depend on more context
}

const LabActionsPane: React.FC<LabActionsPaneProps> = ({
  selectedLabRequest,
  selectedVisitId,
  onResultsReset,
  onResultsModified,
  currentPatientData,
  onAppearanceSettingsChanged,
}) => {
  // استخدام نص عربي مباشر بدلاً من i18n
  // const { can } = useAuthorization();
  const queryClient = useQueryClient();
 // console.log(currentPatientData,'currentPatientData')
//  showJsonDialog(currentPatientData)
  const patientIdForLock =  currentPatientData?.patient_id;
  const currentLockStatus = currentPatientData?.is_result_locked || false;
  const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isUploadingToFirebase, setIsUploadingToFirebase] = useState(false);

  const toggleLockMutation = useMutation({
    mutationFn: (params: { patientId: number; lock: boolean }) =>
      togglePatientResultLock(params.patientId, params.lock),
    onSuccess: (updatedPatient, variables) => {
      // console.log(updatedPatient,'updatedPatient')
      toast.success(variables.lock ? 'تم قفل النتائج بنجاح' : 'تم إلغاء قفل النتائج بنجاح');
      
      // Immediately update the query cache with the response data
      if (updatedPatient) {
        // Update the correct patient cache key that feeds currentPatientData
        queryClient.setQueryData(['patientDetailsForActionPane', variables.patientId], updatedPatient);
        
        // Also update other patient detail caches that might exist
        queryClient.setQueryData(['patientDetailsForInfoPanel', variables.patientId], (old: { data?: { result_is_locked?: boolean } } | undefined) => {
          if (old?.data) {
            return {
              ...old,
              data: {
                ...old.data,
                result_is_locked: updatedPatient.result_is_locked
              }
            };
          }
          return { data: updatedPatient };
        });

        queryClient.setQueryData(['patientDetailsForLabDisplay', variables.patientId], (old: { data?: { result_is_locked?: boolean } } | undefined) => {
          if (old?.data) {
            return {
              ...old,
              data: {
                ...old.data,
                result_is_locked: updatedPatient.result_is_locked
              }
            };
          }
          return { data: updatedPatient };
        });

        // Update queue items if they exist
        queryClient.setQueryData(['labPendingQueue'], (old: { data?: { patient_id: number; result_is_locked?: boolean }[] } | undefined) => {
          if (old?.data) {
            return {
              ...old,
              data: old.data.map((item: { patient_id: number; result_is_locked?: boolean }) => 
                item.patient_id === variables.patientId 
                  ? { ...item, result_is_locked: updatedPatient.result_is_locked }
                  : item
              )
            };
          }
          return old;
        });
      }
      
      // Invalidate queries to ensure fresh data from server (as backup)
      queryClient.invalidateQueries({ queryKey: ['patientDetailsForActionPane', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patientDetailsForInfoPanel', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patientDetailsForLabDisplay', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['labPendingQueue'] });
    },
    onError: (error: Error) => {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'فشلت العملية');
    }
  });

  const handleToggleLock = () => {
    if (!patientIdForLock) {
      toast.error('يرجى اختيار مريض أولاً');
      return;
    }
    toggleLockMutation.mutate({ patientId: patientIdForLock, lock: !currentLockStatus });
  };

  // Placeholder permissions
  const canBatchAuthorize = true; // can('batch_authorize lab_results')
  const canSyncLIS = false; // Example: can('sync_lis') - disabled for now
  const canManageQC = true; // can('manage quality_control')
  const setDefaultMutation = useMutation({
    mutationFn: (labRequestId: number) => setLabRequestResultsToDefault(labRequestId),
    onSuccess: (updatedLabRequest) => {
        toast.success('تم إعادة تعيين النتائج إلى القيم الافتراضية بنجاح');
        queryClient.invalidateQueries({ queryKey: ['labRequestForEntry', updatedLabRequest.id] });
        queryClient.invalidateQueries({ queryKey: ['labRequestsForVisit', selectedVisitId] }); // If visitId is relevant
        queryClient.invalidateQueries({ queryKey: ['labPendingQueue'] }); // If status changes affect queue
        if (onResultsReset) {
            onResultsReset(updatedLabRequest);
        }
    },
    onError: (error: Error) => {
        toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'فشل إعادة تعيين النتائج إلى القيم الافتراضية');
    }
  });

  const handleResetToDefault = () => {
    if (selectedLabRequest) {
        // if (window.confirm(`هل أنت متأكد من إعادة تعيين نتائج ${selectedLabRequest.main_test?.main_test_name} إلى القيم الافتراضية؟`)) {
            setDefaultMutation.mutate(selectedLabRequest.id);
        // }
    }
  };
  
  const populateCbcMutation = useMutation({
    mutationFn: (payload: { labRequestId: number; doctorVisitId: number; mainTestId: number }) =>
      populateCbcResults(payload.labRequestId, { doctor_visit_id_for_sysmex: payload.doctorVisitId,main_test_id: payload.mainTestId }),
    onSuccess: (response) => {
      if (response.status && response.data) {
        toast.success(response.message || 'تم ملء نتائج CBC بنجاح');
        queryClient.invalidateQueries({ queryKey: ['labRequestForEntry', response.data.id] });
        queryClient.invalidateQueries({ queryKey: ['labRequestsForVisit', selectedVisitId] });
        queryClient.invalidateQueries({ queryKey: ['labPendingQueue'] });
        if (onResultsModified && response.data) {
          onResultsModified(response.data);
        }
      } else {
        toast.error(response.message || 'لا توجد بيانات لملء نتائج CBC');
      }
    },
    onError: (error: Error) => {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'فشل ملء نتائج CBC');
    }
  });

  const handlePopulateCbc = () => {
    if (selectedLabRequest && selectedVisitId) { // selectedVisitId is the DoctorVisit ID
      // Check if the selected test is actually a CBC panel.
      // This might require knowing the MainTest ID for CBC or checking its name.
      // For simplicity, we'll assume if the button is enabled, it's for a CBC.
      // You might need a more robust check or pass main_test_id if dynamic.
        populateCbcMutation.mutate({
          labRequestId: selectedLabRequest.id,
          doctorVisitId: selectedVisitId,
          mainTestId: selectedLabRequest.main_test_id
        });
      
    }
  };
  


  const handleOpenWhatsappWorkAreaDialog = () => {
    setIsWhatsAppDialogOpen(true);
  };

  const handleUploadToFirebase = async () => {
    if (!currentPatientData?.patient_id || !selectedVisitId) {
      toast.error('يرجى اختيار مريض أولاً');
      return;
    }

    setIsUploadingToFirebase(true);
    try {
      // Call the backend endpoint to upload to Firebase
      const response = await apiClient.post(`/patients/${currentPatientData.patient_id}/upload-to-firebase`);
      
      if (response.data.success) {
        const { result_url, was_updated, lab_to_lab_object_id } = response.data;
        console.log(currentPatientData,'currentPatientData.lab_to_lab_object_id')
        
     
           
              if (was_updated) {
              toast.success("تم استبدال تقرير المختبر في التخزين السحابي بنجاح");
            } else {
              toast.success("تم رفع تقرير المختبر إلى التخزين السحابي بنجاح");
            }
        
          
        
        // Update the query cache with the new result_url
        queryClient.setQueryData(['patientDetailsForActionPane', currentPatientData.patient_id], (old: Patient | undefined) => {
          if (old) {
            return {
              ...old,
              result_url: response.data.result_url
            };
          }
          return old;
        });
        
        // Also update other patient detail caches
        queryClient.setQueryData(['patientDetailsForInfoPanel', currentPatientData.patient_id], (old: { data?: { result_url?: string } } | undefined) => {
          if (old?.data) {
            return {
              ...old,
              data: {
                ...old.data,
                result_url: response.data.result_url
              }
            };
          }
          return { data: { ...old?.data, result_url: response.data.result_url } };
        });

        queryClient.setQueryData(['patientDetailsForLabDisplay', currentPatientData.patient_id], (old: { data?: { result_url?: string } } | undefined) => {
          if (old?.data) {
            return {
              ...old,
              data: {
                ...old.data,
                result_url: response.data.result_url
              }
            };
          }
          return { data: { ...old?.data, result_url: response.data.result_url } };
        });
        
        // console.log('Patient result_url updated successfully:', result_url);
      } else {
        toast.error("فشل رفع الملف إلى التخزين السحابي", {
          description: response.data.message
        });
      }
    } catch (error: unknown) {
      // console.error('Error uploading to Firebase:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error("حدث خطأ أثناء رفع الملف", {
        description: errorMessage,
      });
    } finally {
      setIsUploadingToFirebase(false);
    }
  };
console.log(currentPatientData,'currentPatientData')
 // console.log(currentLockStatus,'currentLockStatus')
  return (
    <TooltipProvider delayDuration={100}>
      <aside 
        className={cn(
            "bg-card border-border p-1.5 flex flex-col items-center space-y-2 overflow-y-auto h-full shadow-md overflow-x-hidden",
"border-l" // Should be the outermost border
        )}
        style={{width: '72px'}} // Fixed width for larger icons
      >
        {/* <h3 className="text-[10px] font-medium text-muted-foreground pt-1 self-center uppercase tracking-wider">
          {t('common:actions')}
        </h3> 
        <Separator className="my-1" />
        */}

        {canBatchAuthorize && (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-12 h-12"
                        onClick={()=>{window.open(LisServerUrl, '_blank')}}
                        aria-label="التفويض المجمع"
                    >
                        <FontAwesomeIcon icon={faWifi} className="h-7! w-7! text-purple-500" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                    <p>Server Lis </p>
                </TooltipContent>
            </Tooltip>
        )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-12 h-12"
                        onClick={
                          ()=>{window.open(LisClientUrl, '_blank')}
                        }
                    >
                        {setDefaultMutation.isPending ? <Loader2 className="h-7! w-7! animate-spin"/> : <FontAwesomeIcon icon={faBluetoothB} className="h-7! w-7!" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                    <p>Client Lis </p>
                </TooltipContent>
            </Tooltip>
           { selectedVisitId && <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-12 h-12"
                        onClick={handleToggleLock}
                        disabled={populateCbcMutation.isPending}
                    >
                      {toggleLockMutation.isPending ? (
                        <Loader2 className="h-7! w-7! animate-spin" />
                    ) : currentLockStatus === false ? (
                        <FontAwesomeIcon icon={faLockOpen} className="h-7! w-7! text-green-500" />
                    ) : (
                        <FontAwesomeIcon icon={faLock} className="h-7! w-7! text-red-500" />
                    )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                    <p>  منع الطباعه </p>
                </TooltipContent>
            </Tooltip>
        }
        {/* Placeholder for LIS Sync */}
     {  selectedVisitId &&   <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12" onClick={handleOpenWhatsappWorkAreaDialog} >
                    <FontAwesomeIcon icon={faCog} className="h-7! w-7!" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
                <p>واتساب</p>
            </TooltipContent>
        </Tooltip>}

        {/* Firebase Upload Button */}
   {selectedVisitId  &&     <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12" 
                    onClick={handleUploadToFirebase}
                    disabled={isUploadingToFirebase || !currentPatientData?.patient_id || !selectedVisitId}
                >
                    {isUploadingToFirebase ? (
                        <Loader2 className="h-7! w-7! animate-spin" />
                    ) : (
                        <FontAwesomeIcon icon={faCloudUploadAlt} className="h-7! w-7! text-blue-500" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
                <p>رفع إلى التخزين السحابي</p>
            </TooltipContent>
        </Tooltip>
        }

        {canManageQC && (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="" onClick={handleResetToDefault}>
                        <FontAwesomeIcon icon={faDownload} className="h-7! w-7! text-orange-500" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                    <p>القيم الافتراضية</p>
                </TooltipContent>
            </Tooltip>
        )}
        
        <Separator className="my-2" />
 {console.log(currentPatientData,'currentPatientData')}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn("w-12 h-12", currentPatientData?.has_cbc ? "text-red-500" : "")} 
                    onClick={handlePopulateCbc}
                    disabled={populateCbcMutation.isPending}
                >
                    {populateCbcMutation.isPending ? (
                        <Loader2 className="h-7! w-7! animate-spin" />
                    ) : (
                        <FontAwesomeIcon icon={faBars} className="h-7! w-7!" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
                <p> ملء نتائج CBC من Sysmex</p>
            </TooltipContent>
        </Tooltip>
        <Separator className="my-2" />

          {/* New Appearance Settings Button */}
          <Tooltip>
              <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-12 h-12" onClick={() => setIsAppearanceDialogOpen(true)}>
                      <FontAwesomeIcon icon={faBolt} className="h-7! w-7!" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                  <p>إعدادات المظهر</p>
              </TooltipContent>
          </Tooltip>
        <Tooltip>
                <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-12 h-12"
                    onClick={handleToggleLock}
                    disabled={toggleLockMutation.isPending}
                >
                    {toggleLockMutation.isPending ? (
                        <Loader2 className="h-7! w-7! animate-spin" />
                    ) : currentLockStatus === false ? (
                        <FontAwesomeIcon icon={faThumbsUp} className="h-7! w-7! text-green-500" />
                    ) : (
                        <FontAwesomeIcon icon={faThumbsUp} className="h-7! w-7! text-red-500" />
                    )}
                </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                <p>{currentLockStatus === false ? 'إلغاء قفل النتائج' : 'قفل النتائج'}</p>
                </TooltipContent>
            </Tooltip>
        {/* Spacer to push settings to bottom, or use flex-grow on a container above */}
        <div className="flex-grow"></div> 

        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12" onClick={() => toast.info("Navigate to Lab Settings")}> {/* TODO: Navigate */}
                    <FontAwesomeIcon icon={faDove} className="h-7! w-7!" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
                <p>إعدادات المختبر</p>
            </TooltipContent>
        </Tooltip>

      {/* Render the dialogs */}
      <LabAppearanceSettingsDialog
        isOpen={isAppearanceDialogOpen}
        onOpenChange={setIsAppearanceDialogOpen}
        onSettingsChanged={onAppearanceSettingsChanged}
      />
      
      <WhatsAppWorkAreaDialog
        isOpen={isWhatsAppDialogOpen}
        onOpenChange={setIsWhatsAppDialogOpen}
        currentPatient={currentPatientData}
        selectedLabRequest={selectedLabRequest}
        onMessageSent={() => {
          // Optional: Add any callback logic when message is sent
          // console.log('WhatsApp message sent successfully');
        }}
      />
      </aside>
    </TooltipProvider>
  );
};

export default LabActionsPane;