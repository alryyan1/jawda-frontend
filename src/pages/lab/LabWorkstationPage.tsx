// src/pages/lab/LabWorkstationPage.tsx
import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Search,
  FlaskConical,
  Loader2,
  Users,
  Microscope,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// Panel Components
import PatientQueuePanel from "@/components/lab/workstation/PatientQueuePanel";
import ResultEntryPanel from "@/components/lab/workstation/ResultEntryPanel";
import StatusAndInfoPanel from "@/components/lab/workstation/StatusAndInfoPanel";
import LabActionsPane from "@/components/lab/workstation/LabActionsPane";

// Types
import type {
  ChildTestWithResult,
  PatientLabQueueItem,
} from "@/types/labWorkflow";
import type { Shift } from "@/types/shifts";
import type { LabRequest } from "@/types/visits";

// Services
import { getCurrentOpenShift, getShiftsList } from "@/services/shiftService";
import { getDoctorVisitById } from "@/services/visitService";
import { useDebounce } from "@/hooks/useDebounce";
import TestSelectionPanel from "./TestSelectionPanel";

const LabWorkstationPage: React.FC = () => {
  const { t, i18n } = useTranslation([
    "labResults",
    "common",
    "labTests",
    "patients",
    "payments",
    "clinic",
  ]);
  const queryClient = useQueryClient();

  // --- Top Level State for the Workstation ---
  const [globalSearchInput, setGlobalSearchInput] = useState("");
  const debouncedGlobalSearch = useDebounce(globalSearchInput, 500);

  const [selectedQueueItem, setSelectedQueueItem] =
    useState<PatientLabQueueItem | null>(null);
  const [selectedLabRequestForEntry, setSelectedLabRequestForEntry] =
    useState<LabRequest | null>(null);
  const [focusedChildTestForInfo, setFocusedChildTestForInfo] =
    useState<ChildTestWithResult | null>(null);

  // State for the shift being viewed in the PatientQueuePanel
  const [currentShiftForQueue, setCurrentShiftForQueue] =
    useState<Shift | null>(null);

  // Fetch the initially "current" open general clinic shift
  const { isLoading: isLoadingInitialShift } = useQuery<Shift | null, Error>({
    queryKey: ["currentOpenShiftForLabWorkstationPage"],
    queryFn: getCurrentOpenShift,
    refetchOnWindowFocus: false,
  });

  // Use useEffect to handle the initial shift loading
  React.useEffect(() => {
    if (isLoadingInitialShift === false && !currentShiftForQueue) {
      getCurrentOpenShift()
        .then((data) => {
          if (data && !currentShiftForQueue) {
            setCurrentShiftForQueue(data);
          }
        })
        .catch(() => {
          toast.error(t("common:error.failedToLoadCurrentShift"));
        });
    }
  }, [isLoadingInitialShift, currentShiftForQueue, t]);

  // NEW: State for Visit ID search
  const [visitIdSearchTerm, setVisitIdSearchTerm] = useState("");
  const [isSearchingByVisitId, setIsSearchingByVisitId] = useState(false);

  // --- Callbacks & Event Handlers ---
  const handlePatientSelect = useCallback(
    (queueItem: PatientLabQueueItem | null) => {
      setSelectedQueueItem(queueItem);
      setSelectedLabRequestForEntry(null);
      setFocusedChildTestForInfo(null);
    },
    []
  );

  const handleTestSelectForEntry = useCallback(
    (labRequest: LabRequest | null) => {
      setSelectedLabRequestForEntry(labRequest);
      setFocusedChildTestForInfo(null); // Clear focused child test when main test changes
    },
    []
  );

  const handleChildTestFocus = useCallback(
    (childTest: ChildTestWithResult | null) => {
      setFocusedChildTestForInfo(childTest);
    },
    []
  );

  const handleResultsSavedOrUpdated = useCallback(
    (updatedLabRequest: LabRequest) => {
      // This callback is crucial for keeping data consistent after an autosave
      // from ResultEntryPanel. It primarily signals that related queries might need updates.

      // Update the selectedLabRequestForEntry if it's the one that was saved
      if (
        selectedLabRequestForEntry &&
        selectedLabRequestForEntry.id === updatedLabRequest.id
      ) {
        setSelectedLabRequestForEntry((prev) => ({
          ...prev,
          ...updatedLabRequest,
        }));
      }

      // Invalidate queries to refresh data across panels
      if (selectedQueueItem) {
        queryClient.invalidateQueries({
          queryKey: ["labRequestsForVisit", selectedQueueItem.visit_id],
        });
      }
      // The query for 'labRequestForEntry' itself gets invalidated by the save mutation typically
      // queryClient.invalidateQueries({ queryKey: ['labRequestForEntry', updatedLabRequest.id] });

      // Invalidate the main queue, as results being entered might change its pending status
      queryClient.invalidateQueries({
        queryKey: ["labPendingQueue", currentShiftForQueue?.id],
      });

      toast.success(t("labResults:resultEntry.resultsUpdatedGlobally"));
    },
    [
      queryClient,
      selectedLabRequestForEntry,
      selectedQueueItem,
      currentShiftForQueue?.id,
      t,
    ]
  );

  const handleShiftNavigationInQueue = useCallback(
    async (direction: "next" | "prev") => {
      try {
        // This is a simplified example; a real app might have a more direct API endpoint
        // like /api/shifts/{current_shift_id}/{direction}
        const allShiftsResponse = await getShiftsList({
          per_page: 0,
          is_closed: "",
        }); // Fetch all, consider filtering by status if needed
        const allShifts = allShiftsResponse;

        if (!allShifts || allShifts.length === 0) {
          toast.info(t("labResults:queueHeader.noShiftsAvailable"));
          return;
        }
        const sortedShifts = [...allShifts].sort((a, b) => a.id - b.id); // Example: sort by ID

        let currentShiftIndex = -1;
        if (currentShiftForQueue) {
          currentShiftIndex = sortedShifts.findIndex(
            (s) => s.id === currentShiftForQueue.id
          );
        }

        let newShift: Shift | null = null;
        if (sortedShifts.length === 1) {
          newShift = sortedShifts[0]; // Stay on the same shift if only one
        } else if (direction === "prev") {
          newShift =
            currentShiftIndex > 0
              ? sortedShifts[currentShiftIndex - 1]
              : sortedShifts[sortedShifts.length - 1];
        } else {
          // next
          newShift =
            currentShiftIndex < sortedShifts.length - 1 &&
            currentShiftIndex !== -1
              ? sortedShifts[currentShiftIndex + 1]
              : sortedShifts[0];
        }

        if (newShift && newShift.id !== currentShiftForQueue?.id) {
          setCurrentShiftForQueue(newShift);
          handlePatientSelect(null); // Clear selections
        } else if (!currentShiftForQueue && sortedShifts.length > 0) {
          setCurrentShiftForQueue(sortedShifts[0]); // Default to first if none was selected
          handlePatientSelect(null);
        }
      } catch (error) {
        console.error("Error navigating shifts:", error);
        toast.error(
          t("common:error.loadFailed", { entity: t("common:shifts") })
        );
      }
    },
    [currentShiftForQueue, t, handlePatientSelect]
  );

  // Search by Visit ID
  const findVisitByIdMutation = useMutation({
    mutationFn: async (id: number) => {
      // This is a simplified way to get the necessary data.
      // In a real app, you might have a dedicated endpoint returning PatientLabQueueItem structure for a visit.
      const visit = await getDoctorVisitById(id);
      if (
        !visit ||
        !visit.patient ||
        !visit.lab_requests ||
        visit.lab_requests.length === 0
      ) {
        throw new Error(t("clinic:visitNotFoundOrNoLabs", { visitId: id }));
      }
      // Construct a PatientLabQueueItem-like object
      const queueItem: PatientLabQueueItem = {
        visit_id: visit.id,
        patient_id: visit.patient.id,
        patient_name: visit.patient.name,
        lab_number: `LAB-${visit.id}`, // Generate lab number from visit ID
        sample_id: visit.lab_requests[0]?.sample_id || "",
        lab_request_ids: visit.lab_requests.map((lr) => lr.id),
        oldest_request_time: visit.lab_requests.reduce(
          (oldest, lr) =>
            new Date(lr.created_at) < new Date(oldest) ? lr.created_at : oldest,
          visit.lab_requests[0].created_at
        ),
        test_count: visit.lab_requests.length,
      };
      return queueItem;
    },
    onSuccess: (foundQueueItem) => {
      if (foundQueueItem) {
        toast.success(
          t("clinic:visitFoundById", {
            visitId: foundQueueItem.visit_id,
            patientName: foundQueueItem.patient_name,
          })
        );
        // It's better to select the patient and let the TestSelectionPanel load its specific data
        handlePatientSelect(foundQueueItem);
        // Optionally, set the current shift if the found visit belongs to a different one
        // const visitShift = await getShiftById(foundQueueItem.shift_id); // You'd need getShiftById
        // setCurrentShiftForQueue(visitShift);
        setGlobalSearchInput(""); // Clear other search
        setVisitIdSearchTerm(String(foundQueueItem.visit_id));
      }
    },
    onError: (error: Error) =>
      toast.error(error.message || t("common:error.fetchFailed")),
    onSettled: () => setIsSearchingByVisitId(false),
  });

  const handleSearchByVisitId = () => {
    const id = parseInt(visitIdSearchTerm.trim());
    if (isNaN(id) || id <= 0) {
      toast.error(t("clinic:invalidVisitId"));
      return;
    }
    setIsSearchingByVisitId(true);
    findVisitByIdMutation.mutate(id);
  };

  const isRTL = i18n.dir() === "rtl";
  const showTestSelectionPanel = !!selectedQueueItem;
  const showStatusAndInfoPanel = !!selectedQueueItem;

  if (isLoadingInitialShift && !currentShiftForQueue) {
    // Show loader only for the very first shift load
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ltr:ml-3 rtl:mr-3 text-muted-foreground">
          {t("common:loadingShiftInfo")}
        </p>
      </div>
    );
  }
  // Note: currentShiftForQueue can be null if no shifts exist or user navigates to a state with no shift.
  // The PatientQueuePanel's `enabled` prop handles this for its own data fetching.

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 text-sm overflow-hidden">
      {/* Top Section: Title & Global Search */}
      <header className="flex-shrink-0 h-[70px] p-3 border-b bg-card flex items-center justify-between gap-x-4 shadow-sm dark:border-slate-800">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t("labResults:pageTitle")}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-grow max-w-xl">
          <div className="relative flex-grow">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <Input
              type="search"
              placeholder={t("labResults:globalSearchPlaceholder")} // Search patient name, ID, sample ID
              value={globalSearchInput}
              onChange={(e) => {
                setGlobalSearchInput(e.target.value);
                setVisitIdSearchTerm("");
              }}
              className="ps-10 rtl:pr-10 h-10 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 border-slate-300 dark:border-slate-700"
            />
          </div>
          <div className="relative w-auto sm:min-w-[120px]">
            <Input
              type="number"
              placeholder={t(
                "clinic:searchByVisitIdPlaceholderShort",
                "Visit ID"
              )}
              value={visitIdSearchTerm}
              onChange={(e) => {
                setVisitIdSearchTerm(e.target.value);
                setGlobalSearchInput("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchByVisitId();
              }}
              className="h-10 text-sm"
              disabled={isSearchingByVisitId}
            />
            {isSearchingByVisitId && (
              <Loader2 className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>
        </div>
        <div className="w-1/6 hidden lg:block"></div> {/* Spacer */}
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden">
        <aside
          className={cn(
            "w-[280px] xl:w-[320px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full overflow-hidden shadow-lg z-10",
            isRTL
              ? "border-l dark:border-slate-700"
              : "border-r dark:border-slate-700"
          )}
        >
          <PatientQueuePanel
            currentShift={currentShiftForQueue}
            onShiftChange={handleShiftNavigationInQueue}
            onPatientSelect={handlePatientSelect}
            selectedVisitId={selectedQueueItem?.visit_id || null}
            globalSearchTerm={debouncedGlobalSearch}
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
              key={`test-select-${selectedQueueItem.visit_id}`}
              visitId={selectedQueueItem.visit_id}
              patientName={selectedQueueItem.patient_name}
              onTestSelect={handleTestSelectForEntry}
              selectedLabRequestId={selectedLabRequestForEntry?.id || null}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden md:flex flex-col items-center justify-center h-full">
              <Users size={32} className="mb-2 opacity-30" />
              <span>{t("labResults:selectPatientPrompt")}</span>
            </div>
          )}
        </section>

        <main className="flex-grow bg-slate-100 dark:bg-slate-900/70 flex flex-col h-full overflow-hidden relative">
          {selectedLabRequestForEntry ? (
            <ResultEntryPanel
              key={`result-entry-${selectedLabRequestForEntry.id}`}
              initialLabRequest={selectedLabRequestForEntry}
              onResultsSaved={handleResultsSavedOrUpdated}
              onClosePanel={() => setSelectedLabRequestForEntry(null)}
              onChildTestFocus={handleChildTestFocus}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center p-10 text-center">
              <div className="flex flex-col items-center text-muted-foreground">
                <Microscope size={48} className="mb-4 opacity-50" />
                <p>
                  {selectedQueueItem
                    ? t("labResults:selectTestPrompt")
                    : t("labResults:selectPatientAndTestPrompt")}
                </p>
              </div>
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
                selectedLabRequestForEntry?.id || "none"
              }`}
              patientId={selectedQueueItem.patient_id}
              visitId={selectedQueueItem.visit_id}
              selectedLabRequest={selectedLabRequestForEntry}
              focusedChildTest={focusedChildTestForInfo}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden lg:flex flex-col items-center justify-center h-full">
              <Info size={32} className="mb-2 opacity-30" />
              <span>{t("labResults:noInfoToShow")}</span>
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
          <LabActionsPane />
        </aside>
      </div>
      <Toaster richColors position={isRTL ? "top-left" : "top-right"} />
    </div>
  );
};
export default LabWorkstationPage;
