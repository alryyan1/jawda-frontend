// src/pages/lab/LabWorkstationPage.tsx
import React, { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

import type {
  ChildTestWithResult,
  PatientLabQueueItem,
} from "@/types/labWorkflow";
import type { Shift } from "@/types/shifts";
import type { LabRequest, DoctorVisit } from "@/types/visits";

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
  togglePatientResultLock,
} from "@/services/patientService"; // Updated service function
import { getLabRequestsForVisit } from "@/services/labRequestService";
import apiClient from "@/services/api";
import LabQueueFilterDialog, {
  type LabQueueFilters,
} from "@/components/lab/workstation/LabQueueFilterDialog";
import ShiftFinderDialog from "@/components/lab/workstation/ShiftFinderDialog";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";
import SendWhatsAppTextDialog from "@/components/lab/workstation/dialog/SendWhatsAppTextDialog";
import SendPdfToCustomNumberDialog from "@/components/lab/workstation/dialog/SendPdfToCustomNumberDialog";
import {
  sendUltramsgDocument,
  type UltramsgDocumentPayload,
} from "@/services/ultramsgService";
import { fileToBase64 } from "@/services/whatsappService";
import type { Patient } from "@/types/patients";
import {
  getAppearanceSettings,
  type LabAppearanceSettings,
} from "@/lib/appearance-settings-store";
// Removed socket updates and service imports

const LabWorkstationPage: React.FC = () => {
  // Direct Arabic labels for this page
  const AR = {
    pageTitle: "نتائج المختبر",
    searchRecentVisitsByPatientLabel: "زيارات حديثة حسب اسم المريض",
    typeMoreChars: "اكتب مزيدًا من الأحرف",
    noResultsFound: "لا توجد نتائج",
    loading: "جاري التحميل",
    searchByVisitIdPlaceholderShort: "ابحث برقم الزيارة",
    filters_openFilterDialog: "فتح خيارات التصفية",
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
  const [appearanceSettings, setAppearanceSettings] =
    useState<LabAppearanceSettings>(getAppearanceSettings);

  // Callback function to force a re-render of this page, which will re-read settings and pass them down
  const handleAppearanceSettingsChanged = () => {
    setAppearanceSettings(getAppearanceSettings());
  };

  const handleUploadStatusChange = (isUploading: boolean) => {
    setIsUploadingToFirebase(isUploading);
  };

  const [appliedQueueFilters, setAppliedQueueFilters] =
    useState<LabQueueFilters>({
      result_status_filter: "pending", // Default to show pending results
      print_status_filter: "all",
      // other filters undefined initially
    });
  const { data: patientDetailsForActionPane } = useQuery<Patient | null, Error>(
    {
      queryKey: ["patientDetailsForActionPane", selectedQueueItem?.patient_id],
      queryFn: () =>
        selectedQueueItem?.patient_id
          ? getPatientById(selectedQueueItem.patient_id)
          : Promise.resolve(null),
      enabled: !!selectedQueueItem?.patient_id, // Fetch when a patient is selected in the queue
      staleTime: 5 * 60 * 1000, // Cache for 5 mins
    }
  );
  // Global states
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = useState("");
  const [isResultLocked, setIsResultLocked] = useState(false);
  const [focusedChildTestForInfo, setFocusedChildTestForInfo] = useState<ChildTestWithResult | null>(null);
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
  // --- Search State ---
  const [autocompleteInputValue, setAutocompleteInputValue] = useState("");
  const [selectedVisitFromAutocomplete, setSelectedVisitFromAutocomplete] =
    useState<RecentDoctorVisitSearchItem | null>(null);
  const [isShiftFinderDialogOpen, setIsShiftFinderDialogOpen] = useState(false);
  const [isUploadingToFirebase, setIsUploadingToFirebase] = useState(false);

  const handleShiftSelectedFromFinder = (selectedShift: Shift) => {
    setIsManuallyNavigatingShifts(true);
    setCurrentShiftForQueue(selectedShift);
    setSelectedQueueItem(null); // Clear patient selection
    setSelectedLabRequestForEntry(null);
    setFocusedChildTestForInfo(null);
    // Clear other search inputs
    setSelectedVisitFromAutocomplete(null);
    setAutocompleteInputValue("");
    setVisitIdSearchTerm("");
    toast.info(`تم اختيار الوردية رقم ${selectedShift.id}`);
  };
  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");
  // Sockets removed: no realtime lab updates listener
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
      console.log(data, "data");
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
        };

        setSelectedQueueItem(queueItemLike); // This makes it appear "selected" in the context
        console.log(queueItemLike, "queueItemLike");
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
        setFocusedChildTestForInfo(null);
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
          setFocusedChildTestForInfo(null);
        }
      } else {
        toast.info("لا توجد ورديات أخرى");
      }
    },
    [queryClient, currentShiftForQueue]
  );
  const isCurrentResultLocked = selectedQueueItem?.result_is_locked || false;

  const toggleResultLockMutation = useMutation({
    mutationFn: (patientId: number) => togglePatientResultLock(patientId),
    onSuccess: (updatedPatient) => {
      toast.success(
        updatedPatient.result_is_locked
          ? "تم قفل النتائج بنجاح"
          : "تم فتح قفل النتائج بنجاح"
      );
      queryClient.setQueryData(
        ["patientDataForResultLock", updatedPatient.id],
        updatedPatient
      );
      queryClient.invalidateQueries({
        queryKey: ["labPendingQueue", currentShiftForQueue?.id],
      }); // Refresh queue if lock status affects display
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "فشلت العملية"),
  });

  // Context Menu Action Handlers
  const handleSendWhatsAppText = (queueItem: PatientLabQueueItem) =>
    setWhatsAppTextData({ isOpen: true, queueItem });
  const handleSendPdfToPatient = async (queueItem: PatientLabQueueItem) => {
    if (!queueItem.phone) {
      toast.error("رقم هاتف المريض غير متوفر");
      return;
    }
    setPdfPreviewData((prev) => ({
      ...prev,
      isLoading: true,
      title: `يتم إرسال التقرير إلى ${queueItem.patient_name}`,
      isOpen: true,
      url: null,
    }));
    try {
      const pdfResponse = await apiClient.get(
        `/visits/${queueItem.visit_id}/lab-report/pdf?base64=1&pid=${queueItem.visit_id}`
      );
      console.log(pdfResponse.data, "pdfResponse.data");
      const payload: UltramsgDocumentPayload = {
        to: queueItem.phone,
        document: pdfResponse.data,
        filename: `LabReport_Visit_${
          queueItem.visit_id
        }_${queueItem.patient_name.replace(/\s+/g, "_")}.pdf`,
        caption: `تقرير المختبر للزيارة ${queueItem.visit_id} - ${queueItem.patient_name}`,
      };
      const waResponse = await sendUltramsgDocument(payload);
      if (waResponse.success) {
        toast.success("تم إرسال ملف PDF عبر واتساب بنجاح");
      } else {
        toast.error(waResponse.error || "فشل إرسال ملف PDF");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "فشل إرسال ملف PDF عبر واتساب"
      );
    } finally {
      setPdfPreviewData((prev) => ({
        ...prev,
        isLoading: false,
        isOpen: false,
      })); // Close intermediate loading
    }
  };
  const handleSendPdfToCustomNumber = (queueItem: PatientLabQueueItem) =>
    setSendPdfCustomData({ isOpen: true, queueItem });
  const handleToggleResultLock = (queueItem: PatientLabQueueItem) =>
    toggleResultLockMutation.mutate(queueItem.patient_id);
  const handlePatientSelectFromQueue = useCallback(
    async (queueItem: PatientLabQueueItem | null) => {
      setSelectedQueueItem(queueItem);
      setSelectedLabRequestForEntry(null);
      setFocusedChildTestForInfo(null);
      setSelectedVisitFromAutocomplete(null);
      setVisitIdSearchTerm("");
      setAutocompleteInputValue(""); // Clear autocomplete text field
      
      // If a patient is selected, fetch their lab requests and auto-select the first one
      if (queueItem) {
        try {
          // Trigger fetch for patient data to get lock status
          queryClient.prefetchQuery({
            queryKey: ["patientDataForResultLock", queueItem.patient_id],
            queryFn: () => getPatientById(queueItem.patient_id),
          });
          
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
        } catch (error) {
          console.error('Failed to fetch lab requests for auto-selection:', error);
          // Don't show error toast as this is automatic behavior
        }
      }
    },
    [queryClient]
  );

  const handleTestSelectForEntry = useCallback(
    (labRequest: LabRequest | null) => {
      setSelectedLabRequestForEntry(labRequest);
      setFocusedChildTestForInfo(null);
    },
    []
  );

  const handleResultsSaved = useCallback(() => {
    // Don't invalidate queries on individual result saves
    // The data is already updated by the save operation
    // Only invalidate if we need to refresh the entire queue status
    // queryClient.invalidateQueries({
    //   queryKey: ["labPendingQueue", currentShiftForQueue?.id, ""],
    // });
  }, []);

  const handleChildTestFocus = useCallback(
    (childTest: ChildTestWithResult | null) => {
      setFocusedChildTestForInfo(childTest);
    },
    []
  );

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
      } else {
        toast.error("رقم الزيارة غير صالح");
      }
    }
  };

  const handleResetView = () => {
    setIsManuallyNavigatingShifts(false);
    setCurrentShiftForQueue(currentClinicShiftGlobal || null);
    setSelectedQueueItem(null);
    setSelectedLabRequestForEntry(null);
    setFocusedChildTestForInfo(null);
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
  const generateAndShowPdfForActionPane = async (
    title: string,
    fileNamePrefix: string,
    endpoint: string
  ) => {
    if (!selectedQueueItem) {
      toast.error("يرجى اختيار مريض من القائمة أولاً");
      return;
    }
    if (isCurrentResultLocked) {
      toast.error("النتائج مقفلة، لا يمكن المعاينة");
      return;
    }

    const visitIdToUse =
      selectedLabRequest?.doctor_visit_id || selectedQueueItem?.visit_id;
    if (!visitIdToUse) {
      toast.error("Visit context is missing.");
      return;
    }

    setPdfPreviewData((prev) => ({
      ...prev,
      isLoading: true,
      title,
      isOpen: true,
      url: null,
    }));
    try {
      const response = await apiClient.get(
        endpoint.replace("{visitId}", String(visitIdToUse)),
        { responseType: "blob" }
      );
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
    } catch (error: any) {
      console.error(`حدث خطأ أثناء توليد ${title}:`, error);
      toast.error("فشل توليد ملف PDF", {
        description: error.response?.data?.message || error.message,
      });
      setPdfPreviewData((prev) => ({
        ...prev,
        isLoading: false,
        isOpen: false,
      }));
    }
  };
  console.log(selectedQueueItem, "selectedQueueItem");
  return (
    <div
      style={{ height: "100%" }}
      className="flex flex-col  bg-slate-100 dark:bg-slate-900 text-sm overflow-hidden"
    >
      <header className="flex-shrink-0 h-auto p-3 border-b bg-card flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shadow-sm dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
            {AR.pageTitle}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto sm:flex-grow justify-end">
          {/* Upload Status Spinner */}
          {isUploadingToFirebase && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">جاري رفع الملف...</span>
            </div>
          )}
          <Autocomplete
            id="recent-visits-by-patient-dropdown"
            options={recentVisitsData || []}
            value={selectedVisitFromAutocomplete}
            onChange={(event, newValue) => {
              // This is the Autocomplete's selected item, not PatientLabQueueItem
              setSelectedVisitFromAutocomplete(newValue);
              if (newValue?.visit_id) {
                setVisitIdSearchTerm(""); // Clear other search
                fetchVisitDetailsMutation.mutate(newValue.visit_id);
              }
            }}
            inputValue={autocompleteInputValue}
            onInputChange={(event, newInputValue, reason) => {
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
          <Tooltip title={AR.resetViewTooltip}>
            <IconButton onClick={handleResetView} size="small">
              <ListRestart className="h-5 w-5" />
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
          <LabActionsPane
            onAppearanceSettingsChanged={handleAppearanceSettingsChanged}
            selectedLabRequest={selectedLabRequestForEntry || null}
            selectedVisitId={selectedQueueItem?.visit_id || null}
            currentPatientData={patientDetailsForActionPane as Patient | null}
            isResultLocked={isCurrentResultLocked} // Pass lock status
            onPrintReceipt={() =>
              generateAndShowPdfForActionPane(
                "طباعة إيصال المختبر",
                "LabReceipt",
                `/visits/{visitId}/lab-thermal-receipt/pdf`
              )
            }
            onPrintLabels={() =>
              generateAndShowPdfForActionPane(
                "طباعة ملصقات العينات",
                "SampleLabels",
                `/visits/{visitId}/lab-sample-labels/pdf`
              )
            }
            onPreviewReport={() =>
              generateAndShowPdfForActionPane(
                "معاينة تقرير المختبر",
                "LabReport",
                `/visits/{visitId}/lab-report/pdf`
              )
            }
          />
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
              key={`info-panel-${selectedQueueItem.visit_id}-${
                selectedQueueItem.patient_id
              }-${selectedLabRequestForEntry?.id || "none"}`}
              patientId={selectedQueueItem.patient_id}
              visitId={selectedQueueItem.visit_id} // Pass the visit_id (context ID)
              patientLabQueueItem={selectedQueueItem || null}
              onUploadStatusChange={handleUploadStatusChange}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden lg:flex flex-col items-center justify-center h-full">
              {" "}
              <Info size={32} className="mb-2 opacity-30" />{" "}
              <span>{AR.noInfoToShow}</span>{" "}
            </div>
          )}
        </aside>
        <main className="flex-grow bg-slate-100 dark:bg-slate-900/70 flex flex-col h-full overflow-hidden relative">
          {selectedLabRequestForEntry ? (
            <ResultEntryPanel
              key={`result-entry-${selectedLabRequestForEntry.id}`}
              initialLabRequest={selectedLabRequestForEntry}
              onResultsSaved={handleResultsSaved}
              onClosePanel={() => setSelectedLabRequestForEntry(null)}
              onChildTestFocus={handleChildTestFocus}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center p-10 text-center">
              {" "}
              <div className="flex flex-col items-center text-muted-foreground">
                {" "}
                <Microscope size={48} className="mb-4 opacity-50" />{" "}
                <p>
                  {selectedQueueItem
                    ? AR.selectTestPrompt
                    : AR.selectPatientAndTestPrompt}
                </p>{" "}
              </div>{" "}
            </div>
          )}
        </main>

      
        <section
          className={cn(
            "w-[240px] xl:w-[280px] flex-shrink-0 bg-slate-50 dark:bg-slate-800 border-border flex-col h-full overflow-hidden shadow-md",
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
              patientName={selectedQueueItem.patient_name}
              onTestSelect={handleTestSelectForEntry}
              selectedLabRequestId={selectedLabRequestForEntry?.id || null}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden md:flex flex-col items-center justify-center h-full">
              {" "}
              <Users size={32} className="mb-2 opacity-30" />{" "}
              <span>{AR.selectPatientPrompt}</span>{" "}
            </div>
          )}
        </section>
        <aside
          className={cn(
            "w-[322px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full overflow-hidden shadow-lg z-10",
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
            // Passing new context menu handlers
            onSendWhatsAppText={handleSendWhatsAppText}
            onSendPdfToPatient={handleSendPdfToPatient}
            onSendPdfToCustomNumber={handleSendPdfToCustomNumber}
            onToggleResultLock={handleToggleResultLock}
            // Need to update PatientLabQueueItem and PatientLabRequestItem to accept these and isResultLocked
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
      {/* Dialogs */}
      <SendWhatsAppTextDialog
        isOpen={whatsAppTextData.isOpen}
        onOpenChange={(open) =>
          setWhatsAppTextData({
            isOpen: open,
            queueItem: open ? whatsAppTextData.queueItem : null,
          })
        }
        queueItem={whatsAppTextData.queueItem}
      />
      <SendPdfToCustomNumberDialog
        isOpen={sendPdfCustomData.isOpen}
        onOpenChange={(open) =>
          setSendPdfCustomData({
            isOpen: open,
            queueItem: open ? sendPdfCustomData.queueItem : null,
          })
        }
        queueItem={sendPdfCustomData.queueItem}
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
    </div>
  );
};
export default LabWorkstationPage;
