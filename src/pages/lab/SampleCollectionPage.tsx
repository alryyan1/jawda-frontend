// src/pages/lab/SampleCollectionPage.tsx
import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

import { 
  TextField, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  AppBar,
  Toolbar
} from "@mui/material";
import { Search, Users, Check, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import CollectedSamples from "@/components/lab/sample_collection/CollectedSamples";
import NotCollectedSamples from "@/components/lab/sample_collection/NotCollectedSamples";
import VisitSampleContainers from "@/components/lab/sample_collection/VisitSampleContainers";
import RequestedTests from "../../components/lab/sample_collection/RequestedTests";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";

import type { PatientLabQueueItem } from "@/types/labWorkflow";
import type { Shift } from "@/types/shifts";
import type { LabRequest } from "@/types/visits";
import { getCurrentOpenShift } from "@/services/shiftService";
import { togglePatientResultLock } from "@/services/patientService";
import apiClient from "@/services/api";
import { getLabRequestsForVisit } from "@/services/labRequestService";
import { getAppearanceSettings, type LabAppearanceSettings } from "@/lib/appearance-settings-store";
import { getSampleCollectionQueue } from "@/services/sampleCollectionService";

import SendWhatsAppTextDialogSC from "@/components/lab/sample_collection/SendWhatsAppTextDialogSC";
import SendPdfToCustomNumberDialogSC from "@/components/lab/sample_collection/SendPdfToCustomNumberDialogSC";

const SampleCollectionPage: React.FC = () => {
  const {
    currentClinicShift: globalClinicShift,
    isLoading: isLoadingGlobalShift,
  } = useAuth();

  // Page-specific States
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = useState("");

  const [currentShiftForQueue, setCurrentShiftForQueue] =
    useState<Shift | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] =
    useState<PatientLabQueueItem | null>(null);
  const [labRequestsForSelectedVisit, setLabRequestsForSelectedVisit] =
    useState<LabRequest[]>([]);
  const [appearanceSettings] = useState<LabAppearanceSettings>(getAppearanceSettings);

  // Data fetching states
  const [allQueueItems, setAllQueueItems] = useState<PatientLabQueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);


  // Dialog states
  const [whatsAppTextData, setWhatsAppTextData] = useState<{
    isOpen: boolean;
    queueItem: PatientLabQueueItem | null;
  }>({ isOpen: false, queueItem: null });
  const [sendPdfCustomData, setSendPdfCustomData] = useState<{
    isOpen: boolean;
    queueItem: PatientLabQueueItem | null;
  }>({ isOpen: false, queueItem: null });
  const [pdfPreviewData, setPdfPreviewData] = useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
    fileName: string;
    isLoading: boolean;
  }>({ isOpen: false, url: null, title: "", fileName: "", isLoading: false });

  // Fetch all queue data
  const fetchQueueData = useCallback(async () => {
    if (!currentShiftForQueue) return;
    
    setIsLoadingQueue(true);
    setQueueError(null);
    
    try {
      const filters: Record<string, string | number | boolean> = {
        search: debouncedGlobalSearch,
        per_page: 1000, // Fetch all data without pagination
      };
      
      if (currentShiftForQueue.id) {
        filters.shift_id = currentShiftForQueue.id;
      } else {
        const today = new Date().toISOString().split('T')[0];
        filters.date_from = today;
        filters.date_to = today;
      }
      
      const response = await getSampleCollectionQueue(filters);
      setAllQueueItems(response.data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحميل البيانات';
      setQueueError(errorMessage);
      setAllQueueItems([]);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [currentShiftForQueue, debouncedGlobalSearch]);

  useEffect(() => {
    if (
      globalClinicShift &&
      (!currentShiftForQueue ||
        globalClinicShift.id !== currentShiftForQueue.id)
    ) {
      setCurrentShiftForQueue(globalClinicShift);
    } else if (
      !globalClinicShift &&
      !isLoadingGlobalShift &&
      currentShiftForQueue === null
    ) {
      // Attempt to load last open shift if no global default
      getCurrentOpenShift()
        .then((shift) => {
          if (shift) setCurrentShiftForQueue(shift);
        })
        .catch(() => {
          /* no open shift found */
        });
    }
  }, [globalClinicShift, currentShiftForQueue, isLoadingGlobalShift]);

  // Fetch data when shift or search term changes
  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Distribute data based on sample_collected field
  const collectedItems = allQueueItems.filter(item => 
    (item as unknown as Record<string, unknown>).sample_collected === true
  );
  const notCollectedItems = allQueueItems.filter(item => 
    (item as unknown as Record<string, unknown>).sample_collected === false
  );

  
  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedGlobalSearch(globalSearchTerm),
      500
    );
    return () => clearTimeout(handler);
  }, [globalSearchTerm]);

  // Lab requests for selected visit
  const [labRequestsData, setLabRequestsData] = useState<LabRequest[]>([]);
  const [isLoadingLabRequestsForVisit, setIsLoadingLabRequestsForVisit] = useState(false);

  const refetchLabRequestsForVisit = useCallback(async () => {
    if (!selectedQueueItem?.visit_id) return;
    
    setIsLoadingLabRequestsForVisit(true);
    try {
      const allRequests = await getLabRequestsForVisit(selectedQueueItem.visit_id);
      setLabRequestsData(allRequests);
    } catch (error) {
      console.error('Failed to fetch lab requests:', error);
    } finally {
      setIsLoadingLabRequestsForVisit(false);
    }
  }, [selectedQueueItem?.visit_id]);

  useEffect(() => {
    refetchLabRequestsForVisit();
  }, [refetchLabRequestsForVisit]);

  // Update local state when query data changes
  useEffect(() => {
    if (labRequestsData) {
      setLabRequestsForSelectedVisit(labRequestsData);
    }
  }, [labRequestsData]);

  const handlePatientSelect = useCallback(
    (queueItem: PatientLabQueueItem | null) => {
      setSelectedQueueItem(queueItem);
      setLabRequestsForSelectedVisit([]);
    },
    []
  );



  // Removed mark-all success from page; handled within dedicated modules

  // Narrow extra fields that may exist on queue item without using any
  const selectedExtra = selectedQueueItem
    ? (selectedQueueItem as unknown as {
        patient_age?: string | number;
        doctor_name?: string;
        visit_creation_time?: string | Date;
        phone?: string;
      })
    : undefined;

  // Context Menu Action Handlers
  const handleSendWhatsAppText = (queueItem: PatientLabQueueItem) =>
    setWhatsAppTextData({ isOpen: true, queueItem });
  const handleSendPdfToCustomNumber = (queueItem: PatientLabQueueItem) =>
    setSendPdfCustomData({ isOpen: true, queueItem });

  const handleToggleResultLock = async (queueItem: PatientLabQueueItem) => {
    if (!queueItem?.patient_id) return;
    
    try {
      // Get current lock status and toggle it
      const currentLockStatus = (queueItem as unknown as Record<string, unknown>).is_result_locked as boolean;
      const updatedPatient = await togglePatientResultLock(queueItem.patient_id, !currentLockStatus);
      toast.success(
        updatedPatient.result_is_locked
          ? "تم قفل النتائج بنجاح"
          : "تم إلغاء قفل النتائج بنجاح"
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "فشلت العملية";
      toast.error(errorMessage);
    }
  };

  const generateAndShowPdfForActionPane = async (
    titleKey: string,
    fileNamePrefix: string,
    endpointTemplate: string
  ) => {
    const visitIdToUse = selectedQueueItem?.visit_id;
    if (!visitIdToUse) {
      toast.error("يرجى اختيار زيارة أولاً");
      return;
    }

    setPdfPreviewData((prev) => ({
      ...prev,
      isLoading: true,
      title: titleKey,
      isOpen: true,
      url: null,
    }));
    try {
      const endpoint = endpointTemplate.replace(
        "{visitId}",
        String(visitIdToUse)
      );
      const response = await apiClient.get(endpoint, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      setPdfPreviewData((prev) => ({
        ...prev,
        url: objectUrl,
        isLoading: false,
        fileName: `${fileNamePrefix}_Visit${visitIdToUse}_${
          selectedQueueItem?.patient_name.replace(/\s+/g, "_") || "Patient"
        }.pdf`,
      }));
    } catch {
      toast.error("فشل في إنشاء ملف PDF");
      setPdfPreviewData((prev) => ({
        ...prev,
        isLoading: false,
        isOpen: false,
      }));
    }
  };

  if (isLoadingGlobalShift && !currentShiftForQueue) {
    return (
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="100vh"
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <>
      <Box 
        display="flex" 
        flexDirection="column" 
        height="100vh" 
        bgcolor="grey.100" 
        fontSize="0.875rem" 
        overflow="hidden"
      >
        <AppBar
          position="static"
          sx={{
            height: 64,
            flexShrink: 0,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 0,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2, px: 3 }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Clock size={22} color="#6b7280" />
              <Check size={22} color="#6b7280" />
            </Box>
            <Box sx={{ flexGrow: 1, maxWidth: { xs: '200px', sm: '300px', md: '400px' } }}>
              <TextField
                type="search"
                placeholder="البحث في المرضى..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: <Search size={16} style={{ marginRight: 8, color: '#9ca3af' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'background.paper'
                    },
                    '&.Mui-focused': {
                      bgcolor: 'background.paper'
                    }
                  }
                }}
              />
            </Box>
            <Box sx={{ width: '16.67%', display: { xs: 'none', lg: 'block' } }} />
          </Toolbar>
        </AppBar>

        <Box display="flex" flexGrow={1} overflow="hidden">
          {/* Column 1 - Collected Samples */}
          <Paper
            elevation={3}
            sx={{
              width: 200,
              flexShrink: 0,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              zIndex: 10,
              borderRight: 1,
              borderColor: 'divider'
            }}
          >
            <CollectedSamples
              queueItems={collectedItems}
              onPatientSelect={handlePatientSelect}
              selectedVisitId={selectedQueueItem?.visit_id || null}
              appearanceSettings={appearanceSettings}
              isLoading={isLoadingQueue}
              error={queueError}
              onSendWhatsAppText={handleSendWhatsAppText}
              onSendPdfToPatient={() =>
                toast.info(
                  "إرسال PDF للمريض - إجراء قيد التطوير لجمع العينات"
                )
              }
              onSendPdfToCustomNumber={handleSendPdfToCustomNumber}
              onToggleResultLock={handleToggleResultLock}
            />
          </Paper>

          {/* Column 2 - Not Collected Samples */}
          <Paper
            elevation={3}
            sx={{
              width: 200,
              flexShrink: 0,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              zIndex: 10,
              borderRight: 1,
              borderColor: 'divider'
            }}
          >
            <NotCollectedSamples
              queueItems={notCollectedItems}
              onPatientSelect={handlePatientSelect}
              selectedVisitId={selectedQueueItem?.visit_id || null}
              appearanceSettings={appearanceSettings}
              isLoading={isLoadingQueue}
              error={queueError}
              onSendWhatsAppText={handleSendWhatsAppText}
              onSendPdfToPatient={() =>
                toast.info(
                  "إرسال PDF للمريض - إجراء قيد التطوير لجمع العينات"
                )
              }
              onSendPdfToCustomNumber={handleSendPdfToCustomNumber}
              onToggleResultLock={handleToggleResultLock}
            />
          </Paper>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              bgcolor: 'grey.50',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              p: { xs: 2, sm: 3 },
              borderLeft: 1,
              borderColor: 'divider'
            }}
          >
            {selectedQueueItem ? (
              <VisitSampleContainers
                key={`containers-for-${selectedQueueItem.visit_id}`}
                visitId={selectedQueueItem.visit_id}
                patientName={selectedQueueItem.patient_name}
                labRequests={labRequestsForSelectedVisit}
                isLoading={isLoadingLabRequestsForVisit}
                patientAge={selectedExtra?.patient_age}
                doctorName={selectedExtra?.doctor_name}
                visitDateTime={selectedExtra?.visit_creation_time}
                patientPhone={selectedExtra?.phone}
                
              />
            ) : (
              <Box 
                flexGrow={1} 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                p={10} 
                textAlign="center"
              >
                <Box display="flex" flexDirection="column" alignItems="center" color="text.secondary">
                  <Users size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                  <Typography variant="body1">يرجى اختيار مريض لعرض عيناته</Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Column 4 - Requested Tests */}
          <Paper
            elevation={2}
            sx={{
              width: 325,
              flexShrink: 0,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              p: 1.5,
              gap: 1.5,
              borderLeft: 1,
              borderColor: 'divider'
            }}
          >
            <RequestedTests
              selectedVisitId={selectedQueueItem?.visit_id || null}
              labRequests={labRequestsForSelectedVisit}
              onPrintAllLabels={() =>
                generateAndShowPdfForActionPane(
                  "طباعة جميع ملصقات العينات",
                  "AllSampleLabels",
                  `/visits/{visitId}/lab-sample-labels/pdf`
                )
              }
            />
          </Paper>
        </Box>
      </Box>

      {/* Dialogs */}
      <SendWhatsAppTextDialogSC
        isOpen={whatsAppTextData.isOpen}
        onOpenChange={(open) =>
          setWhatsAppTextData({
            isOpen: open,
            queueItem: open ? whatsAppTextData.queueItem : null,
          })
        }
        queueItem={whatsAppTextData.queueItem}
      />
      <SendPdfToCustomNumberDialogSC
        isOpen={sendPdfCustomData.isOpen}
        onOpenChange={(open) =>
          setSendPdfCustomData({
            isOpen: open,
            queueItem: open ? sendPdfCustomData.queueItem : null,
          })
        }
        queueItem={sendPdfCustomData.queueItem}
        pdfType="sample_collection_slip" // Or dynamically determine what PDF to send
      />
      <PdfPreviewDialog
        isOpen={pdfPreviewData.isOpen}
        onOpenChange={(open) => {
          setPdfPreviewData((prev) => ({ ...prev, isOpen: open }));
          if (!open && pdfPreviewData.url) {
            URL.revokeObjectURL(pdfPreviewData.url);
            setPdfPreviewData((prev) => ({ ...prev, url: null }));
          }
        }}
        pdfUrl={pdfPreviewData.url}
        isLoading={pdfPreviewData.isLoading}
        title={pdfPreviewData.title}
        fileName={pdfPreviewData.fileName}
      />
    </>
  );
};
export default SampleCollectionPage;
