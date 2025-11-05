// src/pages/lab/LabWorkstationPage.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
// Replaced shadcn with MUI
import {
  Search,
  FlaskConical,
  Loader2,
  Users,
  Microscope,
  Info,
  ListRestart,
  FilterIcon,
  CalendarSearch,
  Printer,
  Clock,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
// Removed shadcn Toaster import

// MUI Autocomplete for "Recent Visits" dropdown
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";

// Import Panel Components
import PatientQueuePanel from "@/components/lab/workstation/PatientQueuePanel";
import TestSelectionPanel from "./TestSelectionPanel";
import ResultEntryPanel from "@/components/lab/workstation/ResultEntryPanel";
import LabActionsPane from "@/components/lab/workstation/LabActionsPane";
import StatusAndInfoPanel from "@/components/lab/workstation/StatusAndInfoPanel";
import MainCommentDialog from "@/components/lab/workstation/MainCommentDialog";

import type {
  PatientLabQueueItem,
} from "@/types/labWorkflow";
import type { Shift } from "@/types/shifts";
import type { DoctorVisit } from "@/types/visits";

// Type for autocomplete items
interface RecentDoctorVisitSearchItem {
  visit_id: number;
  autocomplete_label: string;
}

import { getCurrentOpenShift, getShiftsList } from "@/services/shiftService";
import { getDoctorVisitById } from "@/services/visitService";
import {
  getPatientById,
  searchRecentDoctorVisits,
  getLabHistory,
  type LabHistoryItem,
} from "@/services/patientService"; // Updated service function
import { getLabRequestsForVisit, updateLabRequestDetails } from "@/services/labRequestService";
import { getSinglePatientLabQueueItem } from "@/services/labWorkflowService";
import apiClient from "@/services/api";
import LabQueueFilterDialog, {
  type LabQueueFilters,
} from "@/components/lab/workstation/LabQueueFilterDialog";
import ShiftFinderDialog from "@/components/lab/workstation/ShiftFinderDialog";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";
import type { Patient } from "@/types/patients";
import {
  getAppearanceSettings,
  type LabAppearanceSettings,
} from "@/lib/appearance-settings-store";
import realtimeService from "@/services/realtimeService";
import type { LabRequest } from "@/types/visits";
import type { SysmexResultEventData } from "@/types/sysmex";
import showJsonDialog from "@/lib/showJsonDialog";

const LabWorkstationPage: React.FC = () => {
  // Direct Arabic labels for this page
  const AR = {
    pageTitle: "نتائج المختبر",
    searchRecentVisitsByPatientLabel: "بحث بالاسم ",
    typeMoreChars: "اكتب مزيدًا من الأحرف",
    noResultsFound: "لا توجد نتائج",
    loading: "جاري التحميل",
    searchByVisitIdPlaceholderShort: "بحث بالكود",
    filters_openFilterDialog: "الفلتره  ",
    shifts_openDialogTooltip: "فتح نافذة اختيار الوردية",
    resetViewTooltip: "إعادة تعيين العرض",
    loadingShiftInfo: "جاري تحميل معلومات الوردية",
    selectPatientPrompt: "اختر مريضًا من القائمة",
    selectTestPrompt: "اختر فحصًا لإدخال النتائج",
    selectPatientAndTestPrompt: "اختر مريضًا ثم اختر فحصًا",
    noInfoToShow: "لا توجد معلومات لعرضها",
  } as const;
  const queryClient = useQueryClient();

  // --- Core State ---
  const [selectedQueueItem, setSelectedQueueItem] =
    useState<PatientLabQueueItem | null>(null);
    // console.log(selectedQueueItem, "selectedQueueItem");
  const [selectedLabRequestForEntry, setSelectedLabRequestForEntry] =
    useState<LabRequest | null>(null);
  const [currentShiftForQueue, setCurrentShiftForQueue] =
    useState<Shift | null>(null);
  const [isManuallyNavigatingShifts, setIsManuallyNavigatingShifts] =
    useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [activeQueueFilters, setActiveQueueFilters] = useState<LabQueueFilters>(
    {}
  );
  const [queueItems, setQueueItems] = useState<PatientLabQueueItem[]>([]);
  const [appearanceSettings, setAppearanceSettings] =
    useState<LabAppearanceSettings>(getAppearanceSettings);

  // Callback function to force a re-render of this page, which will re-read settings and pass them down
  const handleAppearanceSettingsChanged = () => {
    setAppearanceSettings(getAppearanceSettings());
  };

  const handleUploadStatusChange = (isUploading: boolean) => {
    setIsUploadingToFirebase(isUploading);
  };
// console.log(selectedLabRequestForEntry,'selectedLabRequestForEntry')
  const [appliedQueueFilters, setAppliedQueueFilters] =
    useState<LabQueueFilters>({
      result_status_filter: "pending", // Default to show pending results
      print_status_filter: "all",
      // other filters undefined initially
    });
  // Single shared patient query for all components
  const { data: patientDetails } = useQuery<Patient | null, Error>(
    {
      queryKey: ["patientDetails", selectedQueueItem?.patient_id],
      queryFn: () =>
        selectedQueueItem?.patient_id
          ? getPatientById(selectedQueueItem.patient_id)
          : Promise.resolve(null),
      enabled: !!selectedQueueItem?.patient_id, // Fetch when a patient is selected in the queue
      staleTime: 5 * 60 * 1000, // Cache for 5 mins
    }
  );
  // Global states
  const [debouncedGlobalSearch] = useState("");
  const [pdfPreviewData, setPdfPreviewData] = useState<{
    isOpen: boolean;
    url: string | null;
    title: string;
    fileName: string;
    isLoading: boolean;
  }>({ isOpen: false, url: null, title: "", fileName: "", isLoading: false });
  // --- Search State ---
  const [autocompleteInputValue, setAutocompleteInputValue] = useState("");
  const [selectedVisitFromAutocomplete, setSelectedVisitFromAutocomplete] =
    useState<RecentDoctorVisitSearchItem | null>(null);
  const [isShiftFinderDialogOpen, setIsShiftFinderDialogOpen] = useState(false);
  const [isUploadingToFirebase, setIsUploadingToFirebase] = useState(false);
  
  // Comment Dialog State
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [selectedLabRequestForComment, setSelectedLabRequestForComment] = useState<number | null>(null);
  const [currentTestResults, setCurrentTestResults] = useState<any>(null);

  // Get lab requests for comment dialog
  const { data: labRequestsForComment } = useQuery<LabRequest[], Error>({
    queryKey: ['labRequestsForVisit', selectedQueueItem?.visit_id],
    queryFn: () => getLabRequestsForVisit(selectedQueueItem!.visit_id),
    enabled: !!selectedQueueItem?.visit_id,
  });
  
  // Lab History State
  const [labHistoryData, setLabHistoryData] = useState<LabHistoryItem[]>([]);
  const [selectedLabHistoryItem, setSelectedLabHistoryItem] = useState<LabHistoryItem | null>(null);
  const [isLoadingLabHistory, setIsLoadingLabHistory] = useState(false);


  // New Payment Badge State
  const [newPaymentBadges, setNewPaymentBadges] = useState<Set<number>>(new Set());
  
  // Updated item state for PatientQueuePanel
  const [updatedQueueItem, setUpdatedQueueItem] = useState<PatientLabQueueItem | null>(null);

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

  // Function to initialize audio context (call on first user interaction)
  const initializeAudio = useCallback(() => {
    if (!audioContext) {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        setAudioContext(ctx);
        // console.log('Audio context initialized');
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
        // console.log('Payment sound played successfully');
      }
    } catch (error) {
      console.warn('Could not play payment sound:', error);
      // If autoplay is blocked, try to enable it for future plays
      if (error instanceof Error && error.name === 'NotAllowedError') {
        // console.warn('Autoplay blocked - user interaction required to enable sound');
        setSoundEnabled(false);
      }
    }
  }, [soundEnabled, audioContext, initializeAudio]);

  const handleShiftSelectedFromFinder = (selectedShift: Shift) => {
    setIsManuallyNavigatingShifts(true);
    setCurrentShiftForQueue(selectedShift);
    setSelectedQueueItem(null); // Clear patient selection
    setSelectedLabRequestForEntry(null);
    // Clear other search inputs
    setSelectedVisitFromAutocomplete(null);
    setAutocompleteInputValue("");
    setVisitIdSearchTerm("");
    toast.info(`تم اختيار الوردية رقم ${selectedShift.id}`);
  };
  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");
  // Create refs for stable function references
  const playPaymentSoundRef = useRef(playPaymentSound);
  const addPaymentBadgeRef = useRef(addPaymentBadge);
  const queryClientRef = useRef(queryClient);
  const currentShiftForQueueRef = useRef(currentShiftForQueue);
  const selectedQueueItemRef = useRef(selectedQueueItem);

  // Update refs when values change
  useEffect(() => {
    playPaymentSoundRef.current = playPaymentSound;
  }, [playPaymentSound]);

  useEffect(() => {
    addPaymentBadgeRef.current = addPaymentBadge;
  }, [addPaymentBadge]);

  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  useEffect(() => {
    currentShiftForQueueRef.current = currentShiftForQueue;
  }, [currentShiftForQueue]);

  useEffect(() => {
    selectedQueueItemRef.current = selectedQueueItem;
  }, [selectedQueueItem]);

  // Real-time event subscription for lab payments
  useEffect(() => {
    const handleLabPayment = async (data: { visit: DoctorVisit; patient: Patient; labRequests: LabRequest[] }) => {
      // console.log('Lab payment event received in LabWorkstationPage:', data);
      
      try {
        // Convert the visit data to PatientLabQueueItem format (for reference)
        // const queueItemLike: PatientLabQueueItem = {
        //   visit_id: data.visit.id,
        //   patient_id: data.patient.id,
        //   patient_name: data.patient.name,
        //   sample_id: data.labRequests?.find((lr) => lr.sample_id)?.sample_id || `V${data.visit.id}`,
        //   lab_number: `L${data.visit.id}`,
        //   lab_request_ids: data.labRequests.map((lr) => lr.id),
        //   oldest_request_time: data.labRequests.length > 0
        //     ? data.labRequests.reduce(
        //         (oldest, lr) =>
        //           new Date(lr.created_at!) < new Date(oldest)
        //             ? lr.created_at!
        //             : oldest,
        //         data.labRequests[0].created_at!
        //       )
        //     : data.visit.created_at,
        //   test_count: data.labRequests.length,
        //   phone: data.patient.phone || "",
        //   result_is_locked: data.patient.result_is_locked || false,
        //   all_requests_paid: true, // Payment was just made
        //   is_result_locked: data.patient.result_is_locked || false,
        // };

        // Play payment notification sound
        await playPaymentSoundRef.current();

        // Add payment badge for 15 seconds
        addPaymentBadgeRef.current(data.visit.id);

        // Show a toast notification
        // toast.success(`تم دفع فحوصات المختبر للمريض: ${data.patient.name}`);
        
        // Invalidate the queue to refresh with the new paid patient
        queryClientRef.current.invalidateQueries({
          queryKey: ["labPendingQueue", currentShiftForQueueRef.current?.id],
        });
        
      } catch (error) {
        console.error('Error processing lab payment event:', error);
        toast.error('فشل في تحديث قائمة المختبر');
      }
    };

    // console.log('LabWorkstationPage: Setting up lab payment event listener');
    // Subscribe to lab-payment events
    realtimeService.onLabPayment(handleLabPayment);

    // Cleanup subscription on component unmount
    return () => {
      // console.log('LabWorkstationPage: Cleaning up lab payment event listener');
      realtimeService.offLabPayment(handleLabPayment);
    };
  }, []); // Empty dependency array - only run once on mount

  // Real-time event subscription for sysmex results
  useEffect(() => {
    // Debounce map to prevent duplicate processing of the same event
    const processedEvents = new Set<string>();
    
    const handleSysmexResultInserted = async (data: SysmexResultEventData) => {
      // Create a unique key for this event to prevent duplicate processing
      const eventKey = `sysmex-${data.doctorVisit.id}-${data.patient.id}`;
      
      // Check if we've already processed this event recently
      if (processedEvents.has(eventKey)) {
        console.log('Skipping duplicate sysmex result event:', eventKey);
        return;
      }
      
      // Mark this event as processed
      processedEvents.add(eventKey);
      
      // Clean up old processed events after 5 seconds
      setTimeout(() => {
        processedEvents.delete(eventKey);
      }, 5000);
      
      console.log('Sysmex result inserted event received in LabWorkstationPage:', data);
      
      try {
        // Play notification sound
        await playPaymentSoundRef.current();

        // Show a toast notification
        toast.success(`تم استلام نتائج Sysmex للمريض: ${data.patient.name}`, {
          description: `زيارة رقم ${data.doctorVisit.id} - CBC Results Available`
        });

        // Fetch the updated queue item for this specific patient
        try {
          const updatedQueueItem = await getSinglePatientLabQueueItem(data.doctorVisit.id);
          console.log('Fetched updated queue item for sysmex result:', updatedQueueItem);
          
          // Update the queue item in the PatientQueuePanel
          setUpdatedQueueItem(updatedQueueItem);
          
          // Use refs to get current values to avoid stale closures
          const currentSelectedQueueItem = selectedQueueItemRef.current;
          if (currentSelectedQueueItem && currentSelectedQueueItem.visit_id === data.doctorVisit.id) {
            setSelectedQueueItem(updatedQueueItem);
            
            // Refresh lab requests and patient details for the current patient
            queryClientRef.current.invalidateQueries({
              queryKey: ['labRequestsForVisit', data.doctorVisit.id]
            });
            queryClientRef.current.invalidateQueries({
              queryKey: ["patientDetails", data.patient.id]
            });
          }
        } catch (fetchError) {
          console.error('Error fetching updated queue item:', fetchError);
          // Fallback to invalidating the entire queue if single fetch fails
          queryClientRef.current.invalidateQueries({
            queryKey: ["labPendingQueue", currentShiftForQueueRef.current?.id],
          });
        }
        
      } catch (error) {
        console.error('Error processing sysmex result event:', error);
        toast.error('فشل في تحديث بيانات المختبر');
      }
    };

    console.log('LabWorkstationPage: Setting up sysmex result event listener');
    // Subscribe to sysmex-result-inserted events
    realtimeService.onSysmexResultInserted(handleSysmexResultInserted);

    // Cleanup subscription on component unmount
    return () => {
      console.log('LabWorkstationPage: Cleaning up sysmex result event listener');
      realtimeService.offSysmexResultInserted(handleSysmexResultInserted);
    };
  }, []); // Empty dependency array - only run once on mount to prevent multiple subscriptions

  // Fetch global current open clinic shift
  const { data: currentClinicShiftGlobal, isLoading: isLoadingGlobalShift } =
    useQuery<Shift | null, Error>({
      queryKey: ["currentOpenShift"],
      queryFn: getCurrentOpenShift,
      // Removed refetchInterval - fetch only once
    });

  // Initialize or update currentShiftForQueue based on global shift
  useEffect(() => {
    if (currentClinicShiftGlobal && !isManuallyNavigatingShifts) {
      if (
        !currentShiftForQueue ||
        currentShiftForQueue.id !== currentClinicShiftGlobal.id
      ) {
        setCurrentShiftForQueue(currentClinicShiftGlobal);
      }
    } else if (
      !currentClinicShiftGlobal &&
      !isManuallyNavigatingShifts &&
      currentShiftForQueue !== null
    ) {
      // No global shift is open, clear the current queue shift if it wasn't manually set
      setCurrentShiftForQueue(null);
    }
  }, [
    currentClinicShiftGlobal,
    currentShiftForQueue,
    isManuallyNavigatingShifts,
  ]);

  // --- Fetch data for "Recent Visits by Patient Name" Autocomplete ---
  const { data: recentVisitsData, isLoading: isLoadingRecentVisits } = useQuery<
    RecentDoctorVisitSearchItem[],
    Error
  >({
    queryKey: ["recentDoctorVisitsSearch", autocompleteInputValue],
    queryFn: () => searchRecentDoctorVisits(autocompleteInputValue, 15),
    enabled: autocompleteInputValue.length >= 2,
    staleTime: 30000, // Slightly longer stale time for autocomplete results
  });

  // --- Mutation to fetch full visit details when selected from Autocomplete or by ID ---
  const fetchVisitDetailsMutation = useMutation({
    mutationFn: async (targetVisitId: number) =>
      getDoctorVisitById(targetVisitId),
    onSuccess: (data: DoctorVisit) => {
      // showJsonDialog(data)
      // console.log(data, "data");
      if (data && data.patient && data.lab_requests) {
        // alert("data")
        const queueItemLike: PatientLabQueueItem = {
          visit_id: data.id,
          patient_id: data.patient.id,
          patient_name: data.patient.name,
          sample_id:
            data.lab_requests?.find((lr) => lr.sample_id)?.sample_id ||
            `V${data.id}`,
          lab_number: `L${data.id}`,
          lab_request_ids: data.lab_requests.map((lr) => lr.id),
          oldest_request_time:
            data.lab_requests.length > 0
              ? data.lab_requests.reduce(
                  (oldest, lr) =>
                    new Date(lr.created_at!) < new Date(oldest)
                      ? lr.created_at!
                      : oldest,
                  data.lab_requests[0].created_at!
                )
              : data.created_at,
          test_count: data.lab_requests.length,
          phone: data.patient.phone || "",
          result_is_locked: data.patient.result_is_locked || false,
          all_requests_paid: true, // Default to true for now
          is_result_locked: data.patient.result_is_locked || false,
          total_result_count: 0, // Will be updated by backend
          pending_result_count: 0, // Will be updated by backend
          has_cbc: data.patient.has_cbc || false,
        };

        setSelectedQueueItem(queueItemLike); // This makes it appear "selected" in the context
        // console.log(queueItemLike, "queueItemLike");
        // Update currentShiftForQueue if the loaded visit is from a different shift
        if (
          data.shift_id &&
          (!currentShiftForQueue || data.shift_id !== currentShiftForQueue.id)
        ) {
          const shiftFromCache = queryClient
            .getQueryData<Shift[]>(["allShiftsListForNavigation"])
            ?.find((s) => s.id === data.shift_id);
          if (shiftFromCache) {
            setCurrentShiftForQueue(shiftFromCache);
          } else {
            // As a fallback, create a minimal shift object or fetch it
            // For now, we'll just log. Ideally, fetch the full shift details.
            console.warn(
              `Shift ID ${data.shift_id} for visit ${data.id} not found in shift cache. Queue may not reflect this shift yet.`
            );
            // To fully support jumping to any shift, getShiftsList should be called if shiftFromCache is undefined.
            // Or, the DoctorVisit resource could include basic shift details.
            // For now, let PatientQueuePanel refetch with the new currentShiftForQueue ID (if set)
            queryClient
              .fetchQuery<Shift | null>({
                queryKey: ["shiftDetails", data.shift_id],
                queryFn: () =>
                  apiClient
                    .get<{ data: Shift }>(`/shifts/${data.shift_id}`)
                    .then((res) => res.data.data),
              })
              .then((fetchedShift) => {
                if (fetchedShift) setCurrentShiftForQueue(fetchedShift);
              });
          }
          setIsManuallyNavigatingShifts(true);
        }

        if (data.lab_requests && data.lab_requests.length > 0) {
          setSelectedLabRequestForEntry(data.lab_requests[0]); // Select first lab request for entry
        } else {
          setSelectedLabRequestForEntry(null);
          toast.info("لا توجد طلبات مختبر في الزيارة المحددة");
        }
        toast.success(
          `تم تحميل الزيارة رقم ${data.id} للمريض ${data.patient.name}`
        );
      } else {
        toast.error("لم يتم العثور على بيانات الزيارة أو المختبر");
      }
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "فشل في جلب البيانات";
      toast.error(errorMessage);
    },
    onSettled: () => {
      // setVisitIdSearchTerm(''); // Keep the ID for context, or clear if preferred
      // setSelectedVisitFromAutocomplete(null); // Clearing this could be jarring if user just selected it
    },
  });

  const handleShiftNavigationInQueue = useCallback(
    async (direction: "next" | "prev") => {
      setIsManuallyNavigatingShifts(true);
      const allShifts = await queryClient.fetchQuery<Shift[]>({
        queryKey: ["allShiftsListForNavigation"],
        queryFn: () => getShiftsList({ per_page: 0 }), // Fetch all (consider pagination for many shifts)
      });

      if (allShifts && allShifts.length > 0) {
        const currentIndex = currentShiftForQueue
          ? allShifts.findIndex((s) => s.id === currentShiftForQueue.id)
          : -1;
        let newIndex = -1;
        if (currentIndex === -1 && allShifts.length > 0) {
          // If no current shift, pick first/last based on direction
          newIndex = direction === "prev" ? allShifts.length - 1 : 0;
        } else {
          if (direction === "prev")
            newIndex =
              currentIndex > 0 ? currentIndex - 1 : allShifts.length - 1;
          else
            newIndex =
              currentIndex < allShifts.length - 1 ? currentIndex + 1 : 0;
        }

        if (allShifts[newIndex]) {
          setCurrentShiftForQueue(allShifts[newIndex]);
          setSelectedQueueItem(null);
          setSelectedLabRequestForEntry(null);
        }
      } else {
        toast.info("لا توجد ورديات أخرى");
      }
    },
    [queryClient, currentShiftForQueue]
  );
  const isCurrentResultLocked = selectedQueueItem?.result_is_locked || false;


  const handlePatientSelectFromQueue = useCallback(
    async (queueItem: PatientLabQueueItem | null) => {
      setSelectedQueueItem(queueItem);
      setSelectedLabRequestForEntry(null);
      setSelectedVisitFromAutocomplete(null);
      setVisitIdSearchTerm("");
      setAutocompleteInputValue(""); // Clear autocomplete text field
      setSelectedLabHistoryItem(null); // Clear lab history selection
      
      // If a patient is selected, fetch their lab requests and auto-select the first one
      if (queueItem) {
        try {
          // Fetch lab requests for this visit
          const labRequests = await queryClient.fetchQuery({
            queryKey: ['labRequestsForVisit', queueItem.visit_id],
            queryFn: () => getLabRequestsForVisit(queueItem.visit_id),
            staleTime: 5 * 60 * 1000, // Cache for 5 minutes
          });
          
          // Auto-select the first lab request if available
          if (labRequests && labRequests.length > 0) {
            setSelectedLabRequestForEntry(labRequests[0]);
          }

          // Fetch lab history for patients with same phone number
          if (queueItem.phone) {
            setIsLoadingLabHistory(true);
            try {
              const historyResponse = await getLabHistory(queueItem.patient_id, queueItem.phone);
              setLabHistoryData(historyResponse.data);
            } catch (error) {
              console.error('Failed to fetch lab history:', error);
              setLabHistoryData([]);
            } finally {
              setIsLoadingLabHistory(false);
            }
          } else {
            setLabHistoryData([]);
          }
        } catch (error) {
          console.error('Failed to fetch lab requests for auto-selection:', error);
          // Don't show error toast as this is automatic behavior
        }
      } else {
        setLabHistoryData([]);
      }
    },
    [queryClient]
  );

  const handleTestSelectForEntry = useCallback(
    (labRequest: LabRequest | null) => {
      setSelectedLabRequestForEntry(labRequest);
    },
    []
  );

  const handleOpenComment = useCallback(
    (labRequestId: number) => {
      setSelectedLabRequestForComment(labRequestId);
      setIsCommentDialogOpen(true);
    },
    []
  );

  const handleSaveComment = useCallback(
    async (comment: string) => {
      if (!selectedLabRequestForComment) return;
      
      try {
        await updateLabRequestDetails(selectedLabRequestForComment, { comment });
        toast.success('تم حفظ الملاحظة بنجاح');
        
        // Invalidate the lab requests query to refresh the data
        queryClient.invalidateQueries({
          queryKey: ['labRequestsForVisit', selectedQueueItem?.visit_id]
        });
      } catch (error) {
        const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'فشل حفظ الملاحظة';
        toast.error(errorMessage);
      }
    },
    [selectedLabRequestForComment, selectedQueueItem?.visit_id, queryClient]
  );

  const handleTestResultsChange = useCallback((testResults: any) => {
    setCurrentTestResults(testResults);
  }, []);

  const handleSaveAIInterpretation = useCallback(async (interpretation: string) => {
    if (!selectedLabRequestForComment) return;
    
    try {
      await updateLabRequestDetails(selectedLabRequestForComment, { comment: interpretation });
      toast.success('تم حفظ التفسير الذكي بنجاح');
      
      // Invalidate the lab requests query to refresh the data
      queryClient.invalidateQueries({
        queryKey: ['labRequestsForVisit', selectedQueueItem?.visit_id]
      });
      
      setIsCommentDialogOpen(false);
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'فشل حفظ التفسير الذكي';
      toast.error(errorMessage);
    }
  }, [selectedLabRequestForComment, selectedQueueItem?.visit_id, queryClient]);

  const handleLabHistoryItemSelect = useCallback(
    (historyItem: LabHistoryItem | null) => {
      setSelectedLabHistoryItem(historyItem);
      if (historyItem && historyItem.visit_id) {
        // Load the selected visit from history
        fetchVisitDetailsMutation.mutate(historyItem.visit_id);
      }
    },
    [fetchVisitDetailsMutation]
  );

  const handleResultsSaved = useCallback(() => {
    // Don't invalidate queries on individual result saves
    // The data is already updated by the save operation
    // Only invalidate if we need to refresh the entire queue status
    // queryClient.invalidateQueries({
    //   queryKey: ["labPendingQueue", currentShiftForQueue?.id, ""],
    // });
  }, []);

  // Handle single item updates from result entry
  const handleItemUpdated = useCallback((updatedItem: PatientLabQueueItem) => {
    // Update the selected queue item if it matches
    if (selectedQueueItem && selectedQueueItem.visit_id === updatedItem.visit_id) {
      setSelectedQueueItem(updatedItem);
    }
    
    // Set the updated item for PatientQueuePanel to use
    setUpdatedQueueItem(updatedItem);
    
    // Clear the updated item after a short delay to allow the update to be processed
    setTimeout(() => {
      setUpdatedQueueItem(null);
    }, 1000);
  }, [selectedQueueItem]);



  const handleSearchByVisitIdEnter = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && visitIdSearchTerm.trim()) {
      event.preventDefault();
      const id = parseInt(visitIdSearchTerm.trim());
      if (!isNaN(id) && id > 0) {
        setSelectedVisitFromAutocomplete(null); // Clear autocomplete selection
        setAutocompleteInputValue("");
        fetchVisitDetailsMutation.mutate(id);
        setVisitIdSearchTerm("");
      } else {
        toast.error("الكود غير صالح");
      }
    }
  };

  const handleResetView = () => {
    setIsManuallyNavigatingShifts(false);
    setCurrentShiftForQueue(currentClinicShiftGlobal || null);
    setSelectedQueueItem(null);
    setSelectedLabRequestForEntry(null);
    setSelectedVisitFromAutocomplete(null);
    setAutocompleteInputValue("");
    setVisitIdSearchTerm("");
    queryClient.invalidateQueries({ queryKey: ["labPendingQueue"] });
    toast.info("تمت إعادة تعيين العرض");
  };

  const isRTL = true;
  const showTestSelectionPanel = !!selectedQueueItem;
  const showStatusAndInfoPanel = !!selectedQueueItem;

  if (
    isLoadingGlobalShift &&
    !currentClinicShiftGlobal &&
    !currentShiftForQueue
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ltr:ml-3 rtl:mr-3 text-muted-foreground">
          {AR.loadingShiftInfo}
        </p>
      </div>
    );
  }

  const handleApplyQueueFilters = (newFilters: LabQueueFilters) => {
    setAppliedQueueFilters(newFilters);
    setActiveQueueFilters(newFilters); // Also update active filters for dialog
    // PatientQueuePanel will refetch automatically because appliedQueueFilters will be part of its queryKey
    // Or, if not directly part of queryKey, invalidate here:
    queryClient.invalidateQueries({ queryKey: ["labPendingQueue"] });
  };
  // --- PDF Preview Logic for Actions Pane ---
  // Note: This function is kept for potential future use with LabActionsPane
  // const generateAndShowPdfForActionPane = async (
  //   title: string,
  //   fileNamePrefix: string,
  //   endpoint: string
  // ) => {
  //   if (!selectedQueueItem) {
  //     toast.error("يرجى اختيار مريض من القائمة أولاً");
  //     return;
  //   }
  //   if (isCurrentResultLocked) {
  //     toast.error("النتائج مقفلة، لا يمكن المعاينة");
  //     return;
  //   }

  //   const visitIdToUse =
  //     selectedLabRequestForEntry?.doctor_visit_id || selectedQueueItem?.visit_id;
  //   if (!visitIdToUse) {
  //     toast.error("Visit context is missing.");
  //     return;
  //   }

  //   setPdfPreviewData((prev) => ({
  //     ...prev,
  //     isLoading: true,
  //     title,
  //     isOpen: true,
  //     url: null,
  //   }));
  //   try {
  //     const response = await apiClient.get(
  //       endpoint.replace("{visitId}", String(visitIdToUse)),
  //       { responseType: "blob" }
  //     );
  //     const blob = new Blob([response.data], { type: "application/pdf" });
  //     const objectUrl = URL.createObjectURL(blob);
  //     setPdfPreviewData((prev) => ({
  //       ...prev,
  //       url: objectUrl,
  //       isLoading: false,
  //       fileName: `${fileNamePrefix}_Visit${visitIdToUse}_${
  //         selectedQueueItem?.patient_name.replace(/\s+/g, "_") || "Patient"
  //       }.pdf`,
  //     }));
  //   } catch (error: unknown) {
  //     console.error(`حدث خطأ أثناء توليد ${title}:`, error);
  //     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  //     toast.error("فشل توليد ملف PDF", {
  //       description: errorMessage,
  //     });
  //     setPdfPreviewData((prev) => ({
  //       ...prev,
  //       isLoading: false,
  //       isOpen: false,
  //     }));
  //   }
  // };
  // console.log(selectedQueueItem, "selectedQueueItem");
  return (
    <div
      style={{ height: "100%" }}
      className="flex flex-col  bg-slate-100 dark:bg-slate-900 text-sm overflow-hidden"
      onClick={initializeAudio} // Initialize audio on first click
    >
      <header className="flex-shrink-0 h-auto p-1 border-b bg-card flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shadow-sm dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
         
          <Autocomplete
            id="recent-visits-by-patient-dropdown"
            options={recentVisitsData || []}
            value={selectedVisitFromAutocomplete}
            onChange={(_event, newValue) => {
              // This is the Autocomplete's selected item, not PatientLabQueueItem
              setSelectedVisitFromAutocomplete(newValue);
              if (newValue?.visit_id) {
                setVisitIdSearchTerm(""); // Clear other search
                fetchVisitDetailsMutation.mutate(newValue.visit_id);
              }
            }}
            inputValue={autocompleteInputValue}
            onInputChange={(_event, newInputValue, reason) => {
              if (reason === "input") {
                setAutocompleteInputValue(newInputValue);
              } else if (reason === "clear") {
                setAutocompleteInputValue("");
                setSelectedVisitFromAutocomplete(null);
              }
            }}
            getOptionLabel={(option) => option.autocomplete_label}
            isOptionEqualToValue={(option, value) =>
              option.visit_id === value.visit_id
            }
            loading={isLoadingRecentVisits}
            size="small"
            sx={{
              width: { xs: "100%", sm: 250, md: 320 },
              "& .MuiInputLabel-root": {
                fontSize: "0.8rem",
                color: "var(--muted-foreground)",
                "&.Mui-focused": {
                  color: "var(--ring)",
                },
              },
              "& .MuiOutlinedInput-root": {
                fontSize: "0.8rem",
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                "& fieldset": {
                  borderColor: "var(--border)",
                },
                "&:hover fieldset": {
                  borderColor: "var(--ring)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--ring)",
                },
              },
              "& .MuiAutocomplete-inputRoot": {
                paddingTop: "2px",
                paddingBottom: "2px",
              },
              "& .MuiAutocomplete-listbox": {
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              },
              "& .MuiAutocomplete-option": {
                color: "var(--foreground)",
                "&:hover": {
                  backgroundColor: "var(--accent)",
                },
                "&.Mui-focused": {
                  backgroundColor: "var(--accent)",
                },
              },
              "& .MuiAutocomplete-noOptions": {
                color: "var(--muted-foreground)",
              },
              "& .MuiAutocomplete-loading": {
                color: "var(--muted-foreground)",
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={AR.searchRecentVisitsByPatientLabel}
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <Search className="h-4 w-4 text-muted-foreground ltr:mr-2 rtl:ml-2" />
                  ),
                  endAdornment: (
                    <>
                      {isLoadingRecentVisits ||
                      fetchVisitDetailsMutation.isPending ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            PaperComponent={(props) => (
              <Paper
                {...props}
                sx={{
                  fontSize: "0.8rem",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              />
            )}
            noOptionsText={
              autocompleteInputValue.length < 2
                ? AR.typeMoreChars
                : AR.noResultsFound
            }
            loadingText={AR.loading}
          />
             <div className="w-full sm:w-auto">
            <TextField
              type="number"
              size="small"
              placeholder={AR.searchByVisitIdPlaceholderShort}
              value={visitIdSearchTerm}
              onChange={(e) => setVisitIdSearchTerm(e.target.value)}
              onKeyDown={handleSearchByVisitIdEnter}
              disabled={fetchVisitDetailsMutation.isPending}
              sx={{ width: { xs: "100%", sm: 140, md: 160 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </InputAdornment>
                ),
                endAdornment: fetchVisitDetailsMutation.isPending ? (
                  <InputAdornment position="end">
                    <CircularProgress color="inherit" size={16} />
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto sm:flex-grow justify-end">
          {/* Upload Status Spinner */}
          {isUploadingToFirebase && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">جاري رفع الملف...</span>
            </div>
          )}
       

       

          {/* Lab History Autocomplete - Show skeleton when loading, autocomplete when data is ready */}
          {selectedQueueItem && (
            <>
              {isLoadingLabHistory ? (
                <div className="w-[250px] md:w-[300px]">
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ) : labHistoryData.length > 1 ? (
                <Autocomplete
                  id="lab-history-dropdown"
                  options={labHistoryData}
                  value={selectedLabHistoryItem}
                  onChange={(_event, newValue) => {
                    handleLabHistoryItemSelect(newValue);
                  }}
                  getOptionLabel={(option) => option.autocomplete_label}
                  isOptionEqualToValue={(option, value) =>
                    option.patient_id === value.patient_id && option.visit_id === value.visit_id
                  }
                  loading={isLoadingLabHistory}
                  size="small"
                  sx={{
                    minWidth: 250,
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="الهستوري"
                      variant="outlined"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <Search className="h-4 w-4 text-muted-foreground ltr:mr-2 rtl:ml-2" />
                        ),
                        endAdornment: (
                          <>
                            {isLoadingLabHistory ? (
                              <CircularProgress color="inherit" size={18} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  PaperComponent={(props) => (
                    <Paper
                      {...props}
                      sx={{
                        fontSize: "0.8rem",
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  )}
                  noOptionsText="لا توجد سجلات مختبر"
                  loadingText="جاري التحميل..."
                />
              ) : null}
            </>
          )}
          {/* <Tooltip title={appliedQueueFilters.ready_for_print_only ? "إخفاء جاهز للطباعة" : "عرض جاهز للطباعة فقط"}>
            <IconButton
              onClick={() => {
                const newFilters = {
                  ...appliedQueueFilters,
                  ready_for_print_only: !appliedQueueFilters.ready_for_print_only,
                  show_unfinished_only: false, // Disable the other filter
                };
                setAppliedQueueFilters(newFilters);
                setActiveQueueFilters(newFilters);
                queryClient.invalidateQueries({ queryKey: ["labPendingQueue"] });
              }}
              size="small"
              sx={{
                backgroundColor: appliedQueueFilters.ready_for_print_only ? 'success.main' : 'transparent',
                color: appliedQueueFilters.ready_for_print_only ? 'success.contrastText' : 'inherit',
                '&:hover': {
                  backgroundColor: appliedQueueFilters.ready_for_print_only ? 'success.dark' : 'action.hover',
                }
              }}
            >
              <Printer className="h-5 w-5" />
            </IconButton>
          </Tooltip> */}
          
          <Tooltip title={appliedQueueFilters.show_unfinished_only ? "إخفاء النتائج غير المكتملة" : "عرض النتائج غير المكتملة فقط"}>
            <IconButton
              onClick={() => {
                const newFilters = {
                  ...appliedQueueFilters,
                  show_unfinished_only: !appliedQueueFilters.show_unfinished_only,
                  ready_for_print_only: false, // Disable the other filter
                };
                setAppliedQueueFilters(newFilters);
                setActiveQueueFilters(newFilters);
                queryClient.invalidateQueries({ queryKey: ["labPendingQueue"] });
              }}
              size="small"
              sx={{
                backgroundColor: appliedQueueFilters.show_unfinished_only ? 'warning.main' : 'transparent',
                color: appliedQueueFilters.show_unfinished_only ? 'warning.contrastText' : 'inherit',
                '&:hover': {
                  backgroundColor: appliedQueueFilters.show_unfinished_only ? 'warning.dark' : 'action.hover',
                }
              }}
            >
              <Clock className="h-5 w-5" />
            </IconButton>
          </Tooltip>
          <Tooltip title={AR.filters_openFilterDialog}>
            <IconButton
              onClick={() => setIsFilterDialogOpen(true)}
              size="small"
            >
              <FilterIcon className="h-5 w-5" />
            </IconButton>
          </Tooltip>
          <Tooltip title={AR.shifts_openDialogTooltip}>
            <IconButton
              onClick={() => setIsShiftFinderDialogOpen(true)}
              size="small"
            >
              <CalendarSearch className="h-5 w-5" />
            </IconButton>
          </Tooltip>
          {/* <Tooltip title={AR.resetViewTooltip}>
            <IconButton onClick={handleResetView} size="small">
              <ListRestart className="h-5 w-5" />
            </IconButton>
          </Tooltip> */}
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
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden">
        <aside
          className={cn(
            "w-[56px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full items-center p-1.5 space-y-1.5 shadow-md",
            isRTL
              ? "border-r dark:border-slate-700"
              : "border-l dark:border-slate-700"
          )}
        >
          {selectedLabRequestForEntry && selectedQueueItem?.visit_id && (
            <LabActionsPane
              onAppearanceSettingsChanged={handleAppearanceSettingsChanged}
              selectedLabRequest={selectedLabRequestForEntry}
              selectedVisitId={selectedQueueItem.visit_id}
              currentPatientData={selectedQueueItem}
              isResultLocked={isCurrentResultLocked}
              onResultsReset={() => {}} // TODO: Implement if needed
              onResultsModified={() => {}} // TODO: Implement if needed
            />
          )}
        </aside>
  <aside
          className={cn(
            "w-[290px] xl:w-[350px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex-col h-full overflow-hidden shadow-md",
            isRTL
              ? "border-r dark:border-slate-700"
              : "border-l dark:border-slate-700",
            showStatusAndInfoPanel
              ? "flex"
              : "hidden lg:flex lg:items-center lg:justify-center"
          )}
        >
          {selectedQueueItem ? (
            <StatusAndInfoPanel
            handlePatientSelectFromQueue={handlePatientSelectFromQueue}
            setQueueItems={setQueueItems}
              key={`info-panel-${selectedQueueItem.visit_id}-${
                selectedQueueItem.patient_id
              }-${selectedLabRequestForEntry?.id || "none"}`}
              patientId={selectedQueueItem.patient_id}
              visitId={selectedQueueItem.visit_id} // Pass the visit_id (context ID)
              patientLabQueueItem={selectedQueueItem}
              patientData={patientDetails} // Pass shared patient data
              onUploadStatusChange={handleUploadStatusChange}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden lg:flex flex-col items-center justify-center h-full">
              
              <Info size={32} className="mb-2 opacity-30" />
              <span>{AR.noInfoToShow}</span>
            </div>
          )}
        </aside>
        <main className="flex-grow bg-slate-100 dark:bg-slate-900/70 flex flex-col h-full overflow-hidden relative">
          {selectedLabRequestForEntry ? (
            <ResultEntryPanel
              patientLabQueueItem={selectedQueueItem}
              key={`result-entry-${selectedLabRequestForEntry.id}`}
              initialLabRequest={selectedLabRequestForEntry}
              onResultsSaved={handleResultsSaved}
              patientAuthDate={selectedQueueItem?.result_auth}
              onChildTestFocus={() => {}} // Empty function since we're handling focus internally
              visitId={selectedQueueItem?.visit_id}
              onItemUpdated={handleItemUpdated}
              onTestResultsChange={handleTestResultsChange}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center p-10 text-center">
              
              <div className="flex flex-col items-center text-muted-foreground">
                
                <Microscope size={48} className="mb-4 opacity-50" />
                <p>
                  {selectedQueueItem
                    ? AR.selectTestPrompt
                    : AR.selectPatientAndTestPrompt}
                </p>
              </div>
            </div>
          )}
        </main>

      
        <section
          className={cn(
            "w-[230px]  flex-shrink-0 bg-slate-50 dark:bg-slate-800 border-border flex-col h-full overflow-hidden shadow-md",
            isRTL
              ? "border-l dark:border-slate-700"
              : "border-r dark:border-slate-700",
            showTestSelectionPanel
              ? "flex"
              : "hidden md:flex md:items-center md:justify-center"
          )}
        >
          {selectedQueueItem ? (
            <TestSelectionPanel
              key={`test-select-${selectedQueueItem.visit_id}-${selectedQueueItem.patient_id}`} // More unique key
              visitId={selectedQueueItem.visit_id} // This is the visit_id from queue item (which might be patient_id or actual visit ID based on queue logic)
              onTestSelect={handleTestSelectForEntry}
              onOpenComment={handleOpenComment}
              selectedLabRequestId={selectedLabRequestForEntry?.id || null}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden md:flex flex-col items-center justify-center h-full">
              
              <Users size={32} className="mb-2 opacity-30" />
              <span>{AR.selectPatientPrompt}</span>
            </div>
          )}
        </section>
        <aside
          className={cn(
            "w-[300px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full overflow-hidden shadow-lg z-10",
            isRTL
              ? "border-l dark:border-slate-700"
              : "border-r dark:border-slate-700"
          )}
        >
          <PatientQueuePanel
            appearanceSettings={appearanceSettings}
            currentShift={currentShiftForQueue}
            onShiftChange={handleShiftNavigationInQueue}
            onPatientSelect={handlePatientSelectFromQueue}
            selectedVisitId={selectedQueueItem?.visit_id || null}
            globalSearchTerm={debouncedGlobalSearch}
            queueFilters={appliedQueueFilters}
            newPaymentBadges={newPaymentBadges}
            updatedItem={updatedQueueItem}
            queueItems={queueItems}
            setQueueItems={setQueueItems}
          />
        </aside>
      </div>
      <LabQueueFilterDialog
        isOpen={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        currentFilters={activeQueueFilters}
        onApplyFilters={handleApplyQueueFilters}
      />
      <ShiftFinderDialog
        isOpen={isShiftFinderDialogOpen}
        onOpenChange={setIsShiftFinderDialogOpen}
        onShiftSelected={handleShiftSelectedFromFinder}
      />
      {/* Dialogs */}
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
      <MainCommentDialog
        isOpen={isCommentDialogOpen}
        onOpenChange={setIsCommentDialogOpen}
        currentComment={selectedLabRequestForComment ? 
          labRequestsForComment?.find(lr => lr.id === selectedLabRequestForComment)?.comment : 
          null
        }
        onSave={handleSaveComment}
        testResults={currentTestResults}
        onSaveAIInterpretation={handleSaveAIInterpretation}
      />
    </div>
  );
};
export default LabWorkstationPage;
