// src/pages/lab/SampleCollectionPage.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { 
  TextField, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip
} from "@mui/material";
import { Search, Users, Check, Clock, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import CollectedSamples from "@/components/lab/sample_collection/CollectedSamples";
import NotCollectedSamples from "@/components/lab/sample_collection/NotCollectedSamples";
import VisitSampleContainers from "@/components/lab/sample_collection/VisitSampleContainers";
import RequestedTests from "../../components/lab/sample_collection/RequestedTests";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";

import type { PatientLabQueueItem } from "@/types/labWorkflow";
import type { Shift } from "@/types/shifts";
import type { DoctorVisit, LabRequest } from "@/types/visits";
import { getCurrentOpenShift } from "@/services/shiftService";
import { togglePatientResultLock } from "@/services/patientService";
import apiClient from "@/services/api";
import { getLabRequestsForVisit } from "@/services/labRequestService";
import { getAppearanceSettings, type LabAppearanceSettings } from "@/lib/appearance-settings-store";
import { getSampleCollectionQueue } from "@/services/sampleCollectionService";
import realtimeService from "@/services/realtimeService";
import type { Patient } from "@/types/patients";

import SendWhatsAppTextDialogSC from "@/components/lab/sample_collection/SendWhatsAppTextDialogSC";
import SendPdfToCustomNumberDialogSC from "@/components/lab/sample_collection/SendPdfToCustomNumberDialogSC";
import { getDoctorVisitById } from "@/services/visitService";

// Global event handler manager to prevent multiple handlers
class GlobalEventManager {
  private static instance: GlobalEventManager;
  private activeHandlers: Set<string> = new Set();
  private processedEvents: Set<string> = new Set();

  static getInstance(): GlobalEventManager {
    if (!GlobalEventManager.instance) {
      GlobalEventManager.instance = new GlobalEventManager();
    }
    return GlobalEventManager.instance;
  }

  canRegisterHandler(handlerId: string): boolean {
    if (this.activeHandlers.has(handlerId)) {
      console.log('GlobalEventManager: Handler already registered:', handlerId);
      return false;
    }
    this.activeHandlers.add(handlerId);
    console.log('GlobalEventManager: Registered handler:', handlerId);
    return true;
  }

  unregisterHandler(handlerId: string): void {
    this.activeHandlers.delete(handlerId);
    console.log('GlobalEventManager: Unregistered handler:', handlerId);
  }

  canProcessEvent(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) {
      console.log('GlobalEventManager: Event already processed:', eventId);
      return false;
    }
    this.processedEvents.add(eventId);
    
    // Remove event after 5 seconds
    setTimeout(() => {
      this.processedEvents.delete(eventId);
    }, 5000);
    
    return true;
  }

  clear(): void {
    this.activeHandlers.clear();
    this.processedEvents.clear();
  }
}

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
  
  // Ref to prevent concurrent API calls
  const isFetchingRef = useRef(false);
  
  // Ref to manage debounced refresh timeout
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  
  // Ref to track if shift is being loaded to prevent multiple calls
  const shiftLoadingRef = useRef(false);

  // New Payment Badge State
  const [newPaymentBadges, setNewPaymentBadges] = useState<Set<number>>(new Set());

  // Sound system state
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Function to add and remove payment badge
  const addPaymentBadge = useCallback((visitId: number) => {
    setNewPaymentBadges(prev => new Set(prev).add(visitId));
    
    // Remove badge after 15 seconds
    setTimeout(() => {
      setNewPaymentBadges(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitId);
        return newSet;
      });
    }, 15000);
  }, []);

  // Debounced refresh function to prevent multiple rapid API calls
  const debouncedRefresh = useCallback(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      console.log('SampleCollectionPage: Clearing existing refresh timeout');
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Set a new timeout
    console.log('SampleCollectionPage: Setting new debounced refresh timeout');
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('SampleCollectionPage: Executing debounced refresh - making API call');
      fetchQueueDataRef.current();
      refreshTimeoutRef.current = null;
    }, 3000); // Wait 3 seconds before refreshing
  }, []);

  // Function to initialize audio context (call on first user interaction)
  const initializeAudio = useCallback(() => {
    if (!audioContext) {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        setAudioContext(ctx);
        console.log('Audio context initialized');
      } catch (error) {
        console.warn('Could not initialize audio context:', error);
        setSoundEnabled(false);
      }
    }
  }, [audioContext]);

  // Function to play payment sound
  const playPaymentSound = useCallback(async () => {
    if (!soundEnabled) return;

    try {
      // Initialize audio context if needed
      if (!audioContext) {
        initializeAudio();
      }

      const audio = new Audio('/new-payment.mp3');
      audio.volume = 0.7;
      audio.preload = 'auto';
      
      // Try to play the sound
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log('Payment sound played successfully');
      }
    } catch (error) {
      console.warn('Could not play payment sound:', error);
      // If autoplay is blocked, try to enable it for future plays
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('Autoplay blocked - user interaction required to enable sound');
        setSoundEnabled(false);
      }
    }
  }, [soundEnabled, audioContext, initializeAudio]);

  // Fetch all queue data
  const fetchQueueData = useCallback(async () => {
    if (!currentShiftForQueue) return;
    
    // Prevent concurrent API calls
    if (isFetchingRef.current) {
      console.log('SampleCollectionPage: fetchQueueData already in progress, skipping');
      return;
    }
    
    console.log('SampleCollectionPage: fetchQueueData called', {
      shiftId: currentShiftForQueue.id,
      search: debouncedGlobalSearch
    });
    
    isFetchingRef.current = true;
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
      
      console.log('SampleCollectionPage: Making API request with filters:', filters);
      const response = await getSampleCollectionQueue(filters);
      setAllQueueItems(response.data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تحميل البيانات';
      setQueueError(errorMessage);
      setAllQueueItems([]);
    } finally {
      setIsLoadingQueue(false);
      isFetchingRef.current = false;
    }
  }, [currentShiftForQueue, debouncedGlobalSearch]);

  // Create refs for stable function references
  const playPaymentSoundRef = useRef(playPaymentSound);
  const fetchQueueDataRef = useRef(fetchQueueData);
  const addPaymentBadgeRef = useRef(addPaymentBadge);
  const debouncedRefreshRef = useRef(debouncedRefresh);

  // Update refs when functions change
  useEffect(() => {
    playPaymentSoundRef.current = playPaymentSound;
  }, [playPaymentSound]);

  useEffect(() => {
    fetchQueueDataRef.current = fetchQueueData;
  }, [fetchQueueData]);

  useEffect(() => {
    addPaymentBadgeRef.current = addPaymentBadge;
  }, [addPaymentBadge]);

  useEffect(() => {
    debouncedRefreshRef.current = debouncedRefresh;
  }, [debouncedRefresh]);

  // Real-time event subscription for lab payments
  useEffect(() => {
    const eventManager = GlobalEventManager.getInstance();
    const handlerId = 'SampleCollectionPage-LabPayment';
    
    // Check if we can register this handler
    if (!eventManager.canRegisterHandler(handlerId)) {
      console.log('SampleCollectionPage: Event handler already registered globally, skipping');
      return;
    }
    
    const handleLabPayment = async (data: { visit: DoctorVisit; patient: Patient; labRequests: LabRequest[] }) => {
      // Create event identifier based on visit ID only (not timestamp)
      const eventId = `lab-payment-${data.visit.id}`;
      
      // Check if we can process this event globally
      if (!eventManager.canProcessEvent(eventId)) {
        console.log('SampleCollectionPage: Duplicate lab payment event ignored for visit:', data.visit.id);
        return;
      }
      
      console.log('Lab payment event received in SampleCollectionPage:', data, 'Event ID:', eventId);
      
      try {
        // Play payment notification sound
        await playPaymentSoundRef.current();

        // Add payment badge for 15 seconds
        addPaymentBadgeRef.current(data.visit.id);

        // Show a toast notification
        toast.success(`تم دفع فحوصات المختبر للمريض: ${data.patient.name}`);
        
        // Use debounced refresh to prevent multiple rapid calls
        debouncedRefreshRef.current();
        
      } catch (error) {
        console.error('Error processing lab payment event:', error);
        toast.error('فشل في تحديث قائمة جمع العينات');
      }
    };

    console.log('SampleCollectionPage: Setting up lab payment event listener');
    // Subscribe to lab-payment events
    realtimeService.onLabPayment(handleLabPayment);

    // Cleanup subscription on component unmount
    return () => {
      console.log('SampleCollectionPage: Cleaning up lab payment event listener');
      // Clear any pending refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      // Unregister handler from global manager
      eventManager.unregisterHandler(handlerId);
      realtimeService.offLabPayment(handleLabPayment);
    };
  }, []); // Empty dependency array - only run once on mount

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

  useEffect(() => {
    if (
      globalClinicShift &&
      (!currentShiftForQueue ||
        globalClinicShift.id !== currentShiftForQueue.id)
    ) {
      console.log('SampleCollectionPage: Setting shift from global context', globalClinicShift.id);
      setCurrentShiftForQueue(globalClinicShift);
    } else if (
      !globalClinicShift &&
      !isLoadingGlobalShift &&
      currentShiftForQueue === null &&
      !shiftLoadingRef.current
    ) {
      // Attempt to load last open shift if no global default
      console.log('SampleCollectionPage: Loading current open shift');
      shiftLoadingRef.current = true;
      getCurrentOpenShift()
        .then((shift) => {
          if (shift) {
            console.log('SampleCollectionPage: Found open shift', shift.id);
            setCurrentShiftForQueue(shift);
          }
        })
        .catch(() => {
          console.log('SampleCollectionPage: No open shift found');
        })
        .finally(() => {
          shiftLoadingRef.current = false;
        });
    }
  }, [globalClinicShift, currentShiftForQueue, isLoadingGlobalShift]);

  // Fetch data when shift or search term changes
  useEffect(() => {
    // Only fetch if we have a valid shift and avoid duplicate calls
    if (!currentShiftForQueue) {
      console.log('SampleCollectionPage: No shift available, skipping fetch');
      return;
    }
    
    console.log('SampleCollectionPage: useEffect triggered for fetchQueueData', {
      currentShiftForQueue: currentShiftForQueue?.id,
      debouncedGlobalSearch
    });
    fetchQueueData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentShiftForQueue?.id, debouncedGlobalSearch]);

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
        visit_created_at?: string | Date;
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
 const pirntToZebra = (activePatient: DoctorVisit)=>{
  fetch("http://127.0.0.1:5000/", {
    method: "POST",
    headers: {
      "Content-Type": "APPLICATION/JSON",
    },

    body: JSON.stringify(activePatient),
  }).then(() => {});

 }
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
        const doctorVisit = await getDoctorVisitById(visitIdToUse);
        console.log(doctorVisit,"doctorVisit",visitIdToUse,'visitIdToUse');
        pirntToZebra(doctorVisit);
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
        height="100%" 
        bgcolor="grey.100" 
        fontSize="0.875rem" 
        overflow="hidden"
        onClick={initializeAudio} // Initialize audio on first click
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
            <Tooltip title={soundEnabled ? "إيقاف الصوت" : "تشغيل الصوت"}>
              <IconButton 
                onClick={() => {
                  if (!soundEnabled) {
                    setSoundEnabled(true);
                    initializeAudio();
                    toast.info("تم تفعيل الصوت");
                  } else {
                    setSoundEnabled(false);
                    toast.info("تم إيقاف الصوت");
                  }
                }} 
                size="small"
                sx={{
                  color: soundEnabled ? 'success.main' : 'error.main',
                }}
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </IconButton>
            </Tooltip>
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
              newPaymentBadges={newPaymentBadges}
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
              newPaymentBadges={newPaymentBadges}
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
              <>
           {console.log(selectedExtra,"selectedExtra",selectedQueueItem,'selectedQueueItem')}
              <VisitSampleContainers
                key={`containers-for-${selectedQueueItem.visit_id}`}
                visitId={selectedQueueItem.visit_id}
                patientName={selectedQueueItem.patient_name}
                labRequests={labRequestsForSelectedVisit}
                isLoading={isLoadingLabRequestsForVisit}
                patientAge={selectedExtra?.patient_age}
                doctorName={selectedExtra?.doctor_name}
                visitDateTime={selectedExtra?.visit_created_at}
                patientPhone={selectedExtra?.phone}
                onAfterPrint={() => {
                  fetchQueueData();
                  refetchLabRequestsForVisit();
                }}
                
              />
              </>
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
              onAfterPrint={() => {
                fetchQueueData();
                refetchLabRequestsForVisit();
              }}
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
