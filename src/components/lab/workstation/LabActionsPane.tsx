
// src/components/lab/workstation/LabActionsPane.tsx
import React, { useEffect, useState } from 'react';
// استخدام نص عربي مباشر بدلاً من i18n

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faWifi, 
  faLockOpen, 
  faCog, 
  faDownload, 
  faBars, 
  faLock,
  faCloudUploadAlt,
  faPlug,
  faMicroscope,
  faBolt,
  
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { cn } from '@/lib/utils';

import type { LabRequest } from '@/types/visits'; // Or types/visits
import { toast } from 'sonner';
import { setLabRequestResultsToDefault } from '@/services/labWorkflowService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { populateCbcResults, addOrganism } from '@/services/labRequestService';
import { togglePatientResultLock } from '@/services/patientService';
import type { Patient } from '@/types/patients';
import LabAppearanceSettingsDialog from './LabAppearanceSettingsDialog';
import WhatsAppWorkAreaDialog from './dialog/WhatsAppWorkAreaDialog';
import { LisServerUrl } from '@/pages/constants';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/api';
import type { PatientLabQueueItem } from '@/types/labWorkflow';
import { getMetadata, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { getSettings } from '@/services/settingService';
import type { Setting } from '@/types/settings';
import axios from 'axios';
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

  // Fetch settings to get storage_name
  const { data: appSettings } = useQuery<Setting | null, Error>({
    queryKey: ["appSettingsForFirebase"],
    queryFn: getSettings,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  console.log(appSettings,'appSettings')
  const [fileExistsInFirebase, setFileExistsInFirebase] = useState(false);

  useEffect(() => {
    const storageName = appSettings?.storage_name;
    if (!storageName || !currentPatientData?.visit_id) {
      setFileExistsInFirebase(false);
      return;
    }
    
    // Check if Firebase is initialized
    if (!storage) {
      console.warn('Firebase is not initialized. Cannot check file existence.');
      setFileExistsInFirebase(false);
      return;
    }
    
    const fileRef = ref(storage, `results/${storageName}/${currentPatientData.visit_id}/result.pdf`);
    getMetadata(fileRef).then((metadata) => {
      console.log(metadata, 'metadata file exists in firebase');
      setFileExistsInFirebase(true);
    }).catch((error) => {
      console.error('Error checking file in Firebase:', error);
      setFileExistsInFirebase(false);
    });
  }, [appSettings?.storage_name, currentPatientData?.visit_id]);
  const patientIdForLock =  currentPatientData?.patient_id;
  const currentLockStatus = currentPatientData?.is_result_locked || false;
  const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isUploadingToFirebase, setIsUploadingToFirebase] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);

  // console.log('currentpatientdata',currentPatientData)
  const handleHl7ClientOpen = () => {
    window.open('http://127.0.0.1/jawda-medical/hl7-client.php', '_blank');
  };

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
  const canManageQC = true; // can('manage quality_control')
  const setDefaultMutation = useMutation({
    mutationFn: (labRequestId: number) => setLabRequestResultsToDefault(labRequestId),
    onSuccess: (updatedLabRequest) => {
        // toast.success('تم إعادة تعيين النتائج إلى القيم الافتراضية بنجاح');
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

  // Populate Chemistry mutation
  const populateChemistryMutation = useMutation({
    mutationFn: async (payload: { doctorVisitId: number; mainTestId: number }) => {
      const response = await apiClient.post(`/populatePatientChemistryData/${payload.doctorVisitId}`, {
        main_test_id: payload.mainTestId
      });
      return response.data;
    },
    onSuccess: (response) => {
      if (response.status) {
        toast.success('تم ملء نتائج الكيمياء بنجاح');
        queryClient.invalidateQueries({ queryKey: ['labRequestForEntry', selectedLabRequest?.id] });
        queryClient.invalidateQueries({ queryKey: ['labRequestsForVisit', selectedVisitId] });
        queryClient.invalidateQueries({ queryKey: ['labPendingQueue'] });
        // The queries are invalidated above, which will trigger a refetch
        // If onResultsModified callback is needed, it can be called here with refetched data
      } else {
        toast.error(response.message || 'لا توجد بيانات لملء نتائج الكيمياء');
      }
    },
    onError: (error: Error) => {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'فشل ملء نتائج الكيمياء');
    }
  });

  const handlePopulateChemistry = () => {
    if (selectedLabRequest && selectedVisitId) {
      populateChemistryMutation.mutate({
        doctorVisitId: selectedVisitId,
        mainTestId: selectedLabRequest.main_test_id
      });
    } else {
      toast.error('يرجى اختيار طلب فحص أولاً');
    }
  };

  const handleSendWhatsappDirectPdfReport = async () => {
    if (!selectedVisitId) {
      toast.error('يرجى اختيار زيارة أولاً');
      return;
    }

    setIsSendingWhatsapp(true);
    try {
      const response = await apiClient.post(`/sendWhatsappDirectPdfReport`, {
        visit_id: selectedVisitId,
      });
      
      if (response.data.status) {
        toast.success(response.data.message || 'تم إرسال التقرير بواسطة واتساب بنجاح');
      } else {
        toast.error(response.data.message || 'فشل إرسال التقرير');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'حدث خطأ أثناء إرسال التقرير';
      toast.error(errorMessage);
    } finally {
      setIsSendingWhatsapp(false);
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
        const { was_updated } = response.data;
        // console.log(currentPatientData,'currentPatientData.lab_to_lab_object_id')
        
     
           
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
      const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
      const errorMessage = axiosError?.response?.data?.message || 
                          (error instanceof Error ? error.message : 'حدث خطأ غير معروف');
      
      // Check if it's the storage_name error
      if (axiosError?.response?.data?.error === 'storage_name_not_set') {
        toast.error("اسم التخزين غير محدد", {
          description: errorMessage,
        });
      } else {
        toast.error("حدث خطأ أثناء رفع الملف", {
          description: errorMessage,
        });
      }
    } finally {
      setIsUploadingToFirebase(false);
    }
  };
// console.log(currentPatientData,'currentPatientData')
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
                        className="w-12 h-12 text-blue-500"
                        onClick={handleHl7ClientOpen}
                    >
                        <FontAwesomeIcon 
                            icon={faPlug} 
                            className="h-7! w-7! text-blue-500"
                        />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                    <p>فتح HL7 Client</p>
                </TooltipContent>
            </Tooltip>
            {/* //whatsapp button */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-12 h-12"
                        onClick={handleSendWhatsappDirectPdfReport}
                        disabled={isSendingWhatsapp || !selectedVisitId}
                    >
                        {isSendingWhatsapp ? (
                            <Loader2 className="h-7! w-7! animate-spin text-green-500" />
                        ) : (
                            <FontAwesomeIcon icon={faWhatsapp} className="h-7! w-7! text-green-500" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                    <p>ارسال تقرير بواسطة واتساب</p>
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
                    ) : currentPatientData?.is_result_locked === false ? (
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
                        <FontAwesomeIcon icon={faCloudUploadAlt} style={{color: fileExistsInFirebase ? 'lightgreen' : 'red'}} className={cn("h-7! w-7! ")} />
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
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12"
                    onClick={handlePopulateCbc}
                    disabled={populateCbcMutation.isPending}
                >
                    {populateCbcMutation.isPending ? (
                        <Loader2 className="h-7! w-7! animate-spin" />
                    ) : (
                        <FontAwesomeIcon icon={faBars} style={{color: currentPatientData?.has_cbc ? 'red' : ''}} className="h-7! w-7" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
                <p> ملء نتائج CBC من Sysmex</p>
            </TooltipContent>
        </Tooltip>
        
        {/* Add Organism Button */}
        {/* <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12"
                    onClick={handleAddOrganism}
                    disabled={addOrganismMutation.isPending}
                >
                    {addOrganismMutation.isPending ? (
                        <Loader2 className="h-7! w-7! animate-spin" />
                    ) : (
                        <FontAwesomeIcon icon={faMicroscope} className="h-7! w-7! text-purple-500" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
                <p>إضافة كائن حي</p>
            </TooltipContent> */}
        {/* </Tooltip> */}
        <Separator className="my-2" />

          {/* Chemistry Populate Button */}
          <Tooltip>
              <TooltipTrigger asChild>
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-12 h-12"
                      onClick={handlePopulateChemistry}
                      disabled={populateChemistryMutation.isPending || !selectedLabRequest || !selectedVisitId}
                  >
                      {populateChemistryMutation.isPending ? (
                          <Loader2 className="h-7! w-7! animate-spin" />
                      ) : (
                          <FontAwesomeIcon icon={faBolt} style={{color: currentPatientData?.has_chemistry ? 'yellow' : ''}} className="h-7! w-7!" />
                      )}
                  </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                  <p>ملء نتائج الكيمياء</p>
              </TooltipContent>
          </Tooltip>
        {/* <Tooltip>
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
            </Tooltip> */}
        {/* Spacer to push settings to bottom, or use flex-grow on a container above */}
        <div className="flex-grow"></div> 

        {/* <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-12 h-12" onClick={() => toast.info("Navigate to Lab Settings")}> 
                    <FontAwesomeIcon icon={faDove} className="h-7! w-7!" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
                <p>إعدادات المختبر</p>
            </TooltipContent>
        </Tooltip>
         */}

      {/* Render the dialogs */}
      <LabAppearanceSettingsDialog
        isOpen={isAppearanceDialogOpen}
        onOpenChange={setIsAppearanceDialogOpen}
        onSettingsChanged={onAppearanceSettingsChanged}
      />
      
      <WhatsAppWorkAreaDialog
        isOpen={isWhatsAppDialogOpen}
        onOpenChange={setIsWhatsAppDialogOpen}
        currentPatient={currentPatientData as any}
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