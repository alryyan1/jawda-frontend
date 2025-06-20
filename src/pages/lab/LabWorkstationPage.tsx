// src/pages/lab/LabWorkstationPage.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input"; // shadcn Input
import { Button } from "@/components/ui/button"; // shadcn Button
import {
  Search,
  FlaskConical,
  Loader2,
  Users,
  Microscope,
  Info,
  ListRestart,
  FilterIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner"; // shadcn Toaster

// MUI Autocomplete for "Recent Visits" dropdown
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";

// Import Panel Components
import PatientQueuePanel from "@/components/lab/workstation/PatientQueuePanel";
import TestSelectionPanel from "./TestSelectionPanel";
import ResultEntryPanel from "@/components/lab/workstation/ResultEntryPanel";
import LabActionsPane from "@/components/lab/workstation/LabActionsPane";
import StatusAndInfoPanel from "@/components/lab/workstation/StatusAndInfoPanel";

import type {
  ChildTestWithResult,
  LabQueueFilters,
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
import { searchRecentDoctorVisits } from "@/services/patientService"; // Updated service function
import apiClient from "@/services/api";
import LabQueueFilterDialog from "@/components/lab/workstation/LabQueueFilterDialog";

const LabWorkstationPage: React.FC = () => {
  const { t, i18n } = useTranslation([
    "labResults",
    "common",
    "labTests",
    "patients",
    "payments",
  ]);
  const queryClient = useQueryClient();

  // --- Core State ---
  const [selectedQueueItem, setSelectedQueueItem] =
    useState<PatientLabQueueItem | null>(null);
  const [selectedLabRequestForEntry, setSelectedLabRequestForEntry] =
    useState<LabRequest | null>(null);
  const [focusedChildTestForInfo, setFocusedChildTestForInfo] =
    useState<ChildTestWithResult | null>(null);
  const [currentShiftForQueue, setCurrentShiftForQueue] =
    useState<Shift | null>(null);
  const [isManuallyNavigatingShifts, setIsManuallyNavigatingShifts] =
    useState(false);
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [activeQueueFilters, setActiveQueueFilters] = useState<LabQueueFilters>({});
  // --- Search State ---
  const [autocompleteInputValue, setAutocompleteInputValue] = useState("");
  const [selectedVisitFromAutocomplete, setSelectedVisitFromAutocomplete] =
    useState<RecentDoctorVisitSearchItem | null>(null);
  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");

  // Fetch global current open clinic shift
  const { data: currentClinicShiftGlobal, isLoading: isLoadingGlobalShift } =
    useQuery<Shift | null, Error>({
      queryKey: ["currentOpenShiftForLabWorkstation"],
      queryFn: getCurrentOpenShift,
      refetchInterval: 60000, // Poll for global shift changes every minute
    });

  // Initialize or update currentShiftForQueue based on global shift
  useEffect(() => {
    if (currentClinicShiftGlobal && !isManuallyNavigatingShifts) {
      if (!currentShiftForQueue || currentShiftForQueue.id !== currentClinicShiftGlobal.id) {
        setCurrentShiftForQueue(currentClinicShiftGlobal);
      }
    } else if (!currentClinicShiftGlobal && !isManuallyNavigatingShifts && currentShiftForQueue !== null) {
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
      console.log(data, "data")
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
        console.log(queueItemLike, "queueItemLike")
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
          toast.info(t("labResults:noLabRequestsInSelectedVisit"));
        }
        setFocusedChildTestForInfo(null);
        toast.success(
          t("labResults:visitLoaded", {
            visitId: data.id,
            patientName: data.patient.name,
          })
        );
      } else {
        toast.error(t("labResults:visitOrLabDataNotFound"));
      }
    },
    onError: (error: Error) => {
      const errorMessage = error.message || t("common:error.fetchFailed");
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
        toast.info(t("labResults:queueHeader.noOtherShifts"));
      }
    },
    [queryClient, currentShiftForQueue, t]
  );

  const handlePatientSelectFromQueue = useCallback(
    (queueItem: PatientLabQueueItem | null) => {
      setSelectedQueueItem(queueItem);
      setSelectedLabRequestForEntry(null);
      setFocusedChildTestForInfo(null);
      setSelectedVisitFromAutocomplete(null);
      setVisitIdSearchTerm("");
      setAutocompleteInputValue(""); // Clear autocomplete text field
    },
    []
  );

  const handleTestSelectForEntry = useCallback(
    (labRequest: LabRequest | null) => {
      setSelectedLabRequestForEntry(labRequest);
      setFocusedChildTestForInfo(null);
    },
    []
  );

  const handleResultsSaved = useCallback(
    () => {
      if (selectedQueueItem) {
        queryClient.invalidateQueries({
          queryKey: ["labRequestsForVisit", selectedQueueItem.visit_id],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["labPendingQueue", currentShiftForQueue?.id, ""],
      }); // Invalidate queue using current queue shift
    },
    [queryClient, selectedQueueItem, currentShiftForQueue?.id]
  );

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
        toast.error(t("labResults:invalidVisitId"));
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
    toast.info(t("labResults:viewReset"));
  };

  const isRTL = i18n.dir() === "rtl";
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
          {t("common:loadingShiftInfo")}
        </p>
      </div>
    );
  }
  // No need for explicit shiftError handling for global shift here, as queue will show "no shift" if currentShiftForQueue is null
  const handleApplyQueueFilters = (newFilters: LabQueueFilters) => {
    setActiveQueueFilters(newFilters);
    // The PatientQueuePanel's query key will include activeQueueFilters,
    // so it will refetch automatically when activeQueueFilters changes.
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 text-sm overflow-hidden">
      <header className="flex-shrink-0 h-auto p-3 border-b bg-card flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shadow-sm dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <FlaskConical className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
            {t("labResults:pageTitle")}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto sm:flex-grow justify-end">
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
              "& .MuiInputLabel-root": { fontSize: "0.8rem" },
              "& .MuiOutlinedInput-root": {
                fontSize: "0.8rem",
                backgroundColor: "var(--background)",
              },
              "& .MuiAutocomplete-inputRoot": {
                paddingTop: "2px",
                paddingBottom: "2px",
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("labResults:searchRecentVisitsByPatientLabel")}
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
                sx={{ fontSize: "0.8rem" }}
                className="dark:bg-slate-800 dark:text-slate-100"
              />
            )}
            noOptionsText={
              autocompleteInputValue.length < 2
                ? t("common:typeMoreChars")
                : t("common:noResultsFound")
            }
            loadingText={t("common:loading")}
          />

          <div className="relative w-full sm:w-auto">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <Input
              type="number"
              placeholder={t("labResults:searchByVisitIdPlaceholderShort")}
              value={visitIdSearchTerm}
              onChange={(e) => setVisitIdSearchTerm(e.target.value)}
              onKeyDown={handleSearchByVisitIdEnter}
              className="ps-10 rtl:pr-10 h-10 text-sm w-full sm:w-28 md:w-32"
              disabled={fetchVisitDetailsMutation.isPending}
            />
            {fetchVisitDetailsMutation.isPending && (
              <Loader2 className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>
          <Button variant="outline" size="icon" onClick={() => setIsFilterDialogOpen(true)} title={t('labResults:filters.openFilterDialog')} className="h-10 w-10">
                <FilterIcon className="h-5 w-5"/>
            </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetView}
            title={t("labResults:resetViewTooltip")}
            className="h-10 w-10"
          >
            <ListRestart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden">
        <aside
          className={cn(
            "w-[260px] xl:w-[300px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full overflow-hidden shadow-lg z-10",
            isRTL
              ? "border-l dark:border-slate-700"
              : "border-r dark:border-slate-700"
          )}
        >
          <PatientQueuePanel
            currentShift={currentShiftForQueue}
            onShiftChange={handleShiftNavigationInQueue}
            onPatientSelect={handlePatientSelectFromQueue}
            selectedVisitId={selectedQueueItem?.visit_id || null} // This is now patient_id or representative_lab_request_id
            globalSearchTerm={""} // No longer using global text search for queue
            queueFilters={activeQueueFilters} // Pass the active filters
          />
        </aside>

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
              <span>{t("labResults:selectPatientPrompt")}</span>{" "}
            </div>
          )}
        </section>

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
                    ? t("labResults:selectTestPrompt")
                    : t("labResults:selectPatientAndTestPrompt")}
                </p>{" "}
              </div>{" "}
            </div>
          )}
        </main>

        <aside
          className={cn(
            "w-[260px] xl:w-[300px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex-col h-full overflow-hidden shadow-md",
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
              selectedLabRequest={selectedLabRequestForEntry}
              focusedChildTest={focusedChildTestForInfo}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden lg:flex flex-col items-center justify-center h-full">
              {" "}
              <Info size={32} className="mb-2 opacity-30" />{" "}
              <span>{t("labResults:noInfoToShow")}</span>{" "}
            </div>
          )}
        </aside>

        <aside
          className={cn(
            "w-[56px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full items-center p-1.5 space-y-1.5 shadow-md",
            isRTL
              ? "border-r dark:border-slate-700"
              : "border-l dark:border-slate-700"
          )}
        >
          <LabActionsPane selectedLabRequest={selectedLabRequestForEntry} selectedVisitId={selectedQueueItem?.visit_id || 0} onResultsReset={handleResultsSaved} />
        </aside>
      </div>
      <LabQueueFilterDialog
        isOpen={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        currentFilters={activeQueueFilters}
        onApplyFilters={handleApplyQueueFilters}
      />
    </div>
  );
};
export default LabWorkstationPage;
