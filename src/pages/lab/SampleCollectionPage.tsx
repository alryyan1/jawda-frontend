// src/pages/lab/SampleCollectionPage.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Search, Loader2, Users, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

import PatientQueuePanelSC from "@/components/lab/sample_collection/PatientQueuePanelSC";
import SamplesForVisitPanel from "@/components/lab/sample_collection/SamplesForVisitPanel";
import SampleActionsPane from "@/components/lab/sample_collection/SampleActionsPane";
import PdfPreviewDialog from "@/components/common/PdfPreviewDialog";

import type { PatientLabQueueItem } from "@/types/labWorkflow";
import type { Shift } from "@/types/shifts";
import type { LabRequest } from "@/types/visits";
import { getCurrentOpenShift, getShiftsList } from "@/services/shiftService";
import { togglePatientResultLock } from "@/services/patientService";
import apiClient from "@/services/api";
import { getLabRequestsForVisit } from "@/services/labRequestService";

// Services for Sample Collection
import {
  markSampleCollectedApi,
  generateSampleIdForRequestApi,
} from "@/services/sampleCollectionService";
import SendWhatsAppTextDialogSC from "@/components/lab/sample_collection/SendWhatsAppTextDialogSC";
import SendPdfToCustomNumberDialogSC from "@/components/lab/sample_collection/SendPdfToCustomNumberDialogSC";

const SampleCollectionPage: React.FC = () => {
  const { t, i18n } = useTranslation([
    "labSampleCollection",
    "labResults",
    "common",
    "whatsapp",
    "patients",
  ]);
  const queryClient = useQueryClient();
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

  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedGlobalSearch(globalSearchTerm),
      500
    );
    return () => clearTimeout(handler);
  }, [globalSearchTerm]);

  const {
    isLoading: isLoadingLabRequestsForVisit,
    refetch: refetchLabRequestsForVisit,
    data: labRequestsData,
  } = useQuery<LabRequest[], Error>({
    queryKey: ["labRequestsForSampleCollection", selectedQueueItem?.visit_id],
    queryFn: async () => {
      if (!selectedQueueItem?.visit_id) return [];
      const allRequests = await getLabRequestsForVisit(
        selectedQueueItem.visit_id
      );
      // Filter for actual sample collection needs (not just pending collection)
      return allRequests;
    },
    enabled: !!selectedQueueItem?.visit_id,
  });

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

  const handleShiftNavigation = useCallback(
    async (direction: "next" | "prev") => {
      const allShifts = await queryClient.fetchQuery<Shift[]>({
        queryKey: ["allShiftsListForSampleCollectionNav"],
        queryFn: () => getShiftsList({ per_page: 0 }),
      });
      if (allShifts && allShifts.length > 0) {
        const currentIndex = currentShiftForQueue
          ? allShifts.findIndex((s) => s.id === currentShiftForQueue.id)
          : allShifts.length > 0
          ? 0
          : -1; // Default to first if no current
        let newIndex = currentIndex; // Default to current index if logic fails
        if (currentIndex !== -1) {
          // If a current shift is found or we defaulted to first
          if (direction === "prev")
            newIndex =
              currentIndex > 0 ? currentIndex - 1 : allShifts.length - 1;
          else
            newIndex =
              currentIndex < allShifts.length - 1 ? currentIndex + 1 : 0;
        } else if (allShifts.length > 0) {
          // No current shift, but shifts exist
          newIndex = 0; // Default to first shift
        }

        if (newIndex !== -1 && allShifts[newIndex]) {
          setCurrentShiftForQueue(allShifts[newIndex]);
          setSelectedQueueItem(null);
          setLabRequestsForSelectedVisit([]);
        }
      } else {
        toast.info(t("labResults:queueHeader.noOtherShifts"));
      }
    },
    [queryClient, currentShiftForQueue, t]
  );

  // Mutations for actions within SamplesForVisitPanel (passed as callbacks)
  const markSampleCollectedMutation = useMutation({
    mutationFn: (labRequestId: number) => markSampleCollectedApi(labRequestId),
    onSuccess: (updatedLabRequest) => {
      toast.success(t("labSampleCollection:sampleMarkedCollected"));
      // Optimistically update local state for the specific lab request
      setLabRequestsForSelectedVisit((prev) =>
        prev.map((lr) =>
          lr.id === updatedLabRequest.id ? updatedLabRequest : lr
        )
      );
      queryClient.invalidateQueries({
        queryKey: ["sampleCollectionQueue", currentShiftForQueue?.id],
      });
    },
    onError: (error: any) =>
      toast.error(
        error.response?.data?.message || t("common:error.operationFailed")
      ),
  });

  const generateSampleIdMutation = useMutation({
    mutationFn: (labRequestId: number) =>
      generateSampleIdForRequestApi(labRequestId),
    onSuccess: (updatedLabRequest) => {
      toast.success(
        t("labSampleCollection:sampleIdGenerated", {
          sampleId: updatedLabRequest.sample_id,
        })
      );
      setLabRequestsForSelectedVisit((prev) =>
        prev.map((lr) =>
          lr.id === updatedLabRequest.id ? updatedLabRequest : lr
        )
      );
    },
    onError: (error: any) =>
      toast.error(
        error.response?.data?.message || t("common:error.operationFailed")
      ),
  });

  const handleMarkAllCollectedSuccess = (updatedCount: number) => {
    toast.success(
      t("labSampleCollection:allSamplesMarkedCollected", {
        count: updatedCount,
      })
    );
    refetchLabRequestsForVisit(); // Refetch samples for the current visit
    queryClient.invalidateQueries({
      queryKey: ["sampleCollectionQueue", currentShiftForQueue?.id],
    });
  };

  // Context Menu Action Handlers
  const handleSendWhatsAppText = (queueItem: PatientLabQueueItem) =>
    setWhatsAppTextData({ isOpen: true, queueItem });
  const handleSendPdfToCustomNumber = (queueItem: PatientLabQueueItem) =>
    setSendPdfCustomData({ isOpen: true, queueItem });

  const toggleResultLockMutation = useMutation({
    mutationFn: (patientId: number) => togglePatientResultLock(patientId),
    onSuccess: (updatedPatient) => {
      toast.success(
        updatedPatient.result_is_locked
          ? t("labResults:contextMenu.resultsLockedSuccess")
          : t("labResults:contextMenu.resultsUnlockedSuccess")
      );
      queryClient.setQueryData(
        ["patientDataForSampleCollectionLock", updatedPatient.id],
        updatedPatient
      );
      // No need to invalidate queue here unless lock status is a filter for the queue itself
    },
    onError: (error: any) =>
      toast.error(
        error.response?.data?.message || t("common:error.operationFailed")
      ),
  });
  const handleToggleResultLock = (queueItem: PatientLabQueueItem) => {
    if (queueItem?.patient_id)
      toggleResultLockMutation.mutate(queueItem.patient_id);
  };

  const generateAndShowPdfForActionPane = async (
    titleKey: string,
    fileNamePrefix: string,
    endpointTemplate: string
  ) => {
    const visitIdToUse = selectedQueueItem?.visit_id;
    if (!visitIdToUse) {
      toast.error(t("labSampleCollection:selectVisitFirst"));
      return;
    }

    setPdfPreviewData((prev) => ({
      ...prev,
      isLoading: true,
      title: t(titleKey),
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
    } catch (error: any) {
      toast.error(t("common:error.generatePdfFailed"), {
        description: error.response?.data?.message || error.message,
      });
      setPdfPreviewData((prev) => ({
        ...prev,
        isLoading: false,
        isOpen: false,
      }));
    }
  };

  if (isLoadingGlobalShift && !currentShiftForQueue) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 text-sm overflow-hidden">
        <header className="flex-shrink-0 h-[70px] p-3 border-b bg-card flex items-center justify-between gap-x-4 shadow-sm dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Syringe className="h-7 w-7 text-blue-500" />
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {t("labSampleCollection:pageTitle")}
            </h1>
          </div>
          <div className="relative flex-grow max-w-xs sm:max-w-sm md:max-w-md">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <Input
              type="search"
              placeholder={t("labResults:globalSearchPlaceholder")}
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className="ps-10 rtl:pr-10 h-10 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 border-slate-300 dark:border-slate-700"
            />
          </div>
          <div className="w-1/6 hidden lg:block"></div>
        </header>

        <div className="flex-grow flex overflow-hidden">
          <aside
            className={cn(
              "w-[calc(50px*4+8px*3)] sm:w-[calc(50px*5+8px*4)] md:w-[calc(50px*6+8px*5)] lg:w-[calc(50px*7+8px*6)] xl:w-[calc(50px*8+8px*7)] 2xl:w-[calc(50px*9+8px*8)] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full overflow-hidden shadow-lg z-10",
              i18n.dir() === "rtl"
                ? "border-l dark:border-slate-700"
                : "border-r dark:border-slate-700"
            )}
          >
            <PatientQueuePanelSC
              currentShift={currentShiftForQueue}
              onShiftChange={handleShiftNavigation}
              onPatientSelect={handlePatientSelect}
              selectedVisitId={selectedQueueItem?.visit_id || null}
              globalSearchTerm={debouncedGlobalSearch}
              onSendWhatsAppText={handleSendWhatsAppText}
              onSendPdfToPatient={() =>
                toast.info(
                  "Send PDF to Patient - action TBD for Sample Collection"
                )
              } // Example
              onSendPdfToCustomNumber={handleSendPdfToCustomNumber}
              onToggleResultLock={handleToggleResultLock}
            />
          </aside>

          <main
            className={cn(
              "flex-grow bg-slate-50 dark:bg-slate-800/20 flex flex-col h-full overflow-hidden relative p-2 sm:p-3",
              i18n.dir() === "rtl"
                ? "border-r dark:border-slate-700"
                : "border-l dark:border-slate-700"
            )}
          >
            {selectedQueueItem ? (
              <SamplesForVisitPanel
                key={`samples-for-${selectedQueueItem.visit_id}`}
                visitId={selectedQueueItem.visit_id}
                patientName={selectedQueueItem.patient_name}
                labRequests={labRequestsForSelectedVisit}
                isLoading={isLoadingLabRequestsForVisit}
                onSampleCollectedSuccess={(updatedLR) => {
                  setLabRequestsForSelectedVisit((prev) =>
                    prev.map((lr) => (lr.id === updatedLR.id ? updatedLR : lr))
                  );
                  queryClient.invalidateQueries({
                    queryKey: [
                      "sampleCollectionQueue",
                      currentShiftForQueue?.id,
                    ],
                  });
                }}
                onGenerateSampleIdSuccess={(updatedLR) => {
                  setLabRequestsForSelectedVisit((prev) =>
                    prev.map((lr) => (lr.id === updatedLR.id ? updatedLR : lr))
                  );
                }}
              />
            ) : (
              <div className="flex-grow flex items-center justify-center p-10 text-center">
                <div className="flex flex-col items-center text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-30" />
                  <p>{t("labSampleCollection:selectPatientPrompt")}</p>
                </div>
              </div>
            )}
          </main>

          <aside
            className={cn(
              "w-[56px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full items-center p-1.5 space-y-1.5 shadow-md",
              i18n.dir() === "rtl"
                ? "border-r dark:border-slate-700"
                : "border-l dark:border-slate-700"
            )}
          >
            <SampleActionsPane
              selectedVisitId={selectedQueueItem?.visit_id || null}
              canMarkAllCollected={labRequestsForSelectedVisit.some(
                (lr) => !lr.sample_collected_at
              )}
              onMarkAllCollectedSuccess={handleMarkAllCollectedSuccess}
              onPrintAllLabels={() =>
                generateAndShowPdfForActionPane(
                  t("labSampleCollection:actions.printAllLabelsDialogTitle"),
                  "AllSampleLabels",
                  `/visits/{visitId}/lab-sample-labels/pdf`
                )
              }
            />
          </aside>
        </div>
      </div>

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
      <Toaster
        richColors
        position={i18n.dir() === "rtl" ? "top-left" : "top-right"}
      />
    </>
  );
};
export default SampleCollectionPage;
