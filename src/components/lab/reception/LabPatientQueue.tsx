// src/components/lab/reception/LabPatientQueue.tsx
import React, { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, Users } from "lucide-react";

import QueueHeader from "@/components/lab/workstation/QueueHeader";
import PatientLabReceptionItem from "../workstation/PatientLabReceptionItem";
import { getNewlyRegisteredLabPendingQueue } from "@/services/labWorkflowService";

import type { Shift } from "@/types/shifts";
import type { PatientLabQueueItem, LabQueueFilters } from "@/types/labWorkflow";
import type { LabAppearanceSettings } from "@/lib/appearance-settings-store";

interface LabPatientQueueProps {
  currentShift: Shift | null;
  onShiftChange: (direction: "next" | "prev") => void;
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  globalSearchTerm: string;
  labFilters?: LabQueueFilters;
  filters?: LabQueueFilters; // Alternative prop name kept for compatibility
  appearanceSettings: LabAppearanceSettings;
  /** Visit ids that just had lab tests sent from the Doctor Portal — shows a pulsing "new request" dot. */
  newLabRequestVisitIds?: Set<number>;
}

export interface LabPatientQueueRef {
  appendPatientToQueue: (patient: PatientLabQueueItem) => void;
  refresh: () => void;
}

/* ------------------------------ View states ------------------------------ */

const QueueLoadingOverlay: React.FC = () => (
  <div
    role="status"
    aria-label="جاري التحميل"
    className="absolute inset-0 z-10 flex items-center justify-center bg-card/50 dark:bg-background/50"
  >
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const QueueRefreshingBar: React.FC = () => (
  <div className="border-b border-border p-1 text-center text-xs text-muted-foreground" role="status">
    <Loader2 className="inline h-3 w-3 animate-spin" /> جاري تحديث القائمة
  </div>
);

const QueueErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 text-center text-destructive" role="alert">
    <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
    <p className="font-semibold">فشل في جلب بيانات المرضى</p>
    <p className="mt-1 text-xs">{message}</p>
  </div>
);

const QueueEmptyState: React.FC<{ hasSearchTerm: boolean }> = ({ hasSearchTerm }) => (
  <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
    <Users className="mb-3 h-12 w-12 text-muted-foreground/20" />
    <p className="font-medium">{hasSearchTerm ? "لا توجد نتائج" : "لا يوجد مرضى لهذه الوردية."}</p>
    <p className="mt-1 text-xs">استخدم نموذج التسجيل لإضافة مريض جديد.</p>
  </div>
);

/* -------------------------------- Queue ---------------------------------- */

const LabPatientQueue = React.forwardRef<LabPatientQueueRef, LabPatientQueueProps>(
  (
    {
      appearanceSettings,
      currentShift,
      onShiftChange,
      onPatientSelect,
      selectedVisitId,
      globalSearchTerm,
      labFilters,
      filters,
      newLabRequestVisitIds,
    },
    ref
  ) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [queueItems, setQueueItems] = useState<PatientLabQueueItem[]>([]);
    const [, setMeta] = useState<{ total: number; page: number; limit: number } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchQueueData = useCallback(async () => {
      if (!currentShift) return;

      setIsFetching(true);
      setError(null);

      try {
        const activeFilters = labFilters || filters || {};
        const requestFilters: LabQueueFilters & { search?: string; page?: number; per_page?: number; shift_id?: number } = {
          ...activeFilters,
          search: globalSearchTerm,
          page: currentPage,
          per_page: 50,
        };
        if (currentShift?.id) {
          requestFilters.shift_id = currentShift.id;
        }

        const paginatedQueue = await getNewlyRegisteredLabPendingQueue(requestFilters);
        setQueueItems(paginatedQueue.data);
        setMeta(paginatedQueue.meta);
      } catch (err) {
        setError(err as Error);
        console.error("Error fetching queue data:", err);
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    }, [currentShift, labFilters, filters, globalSearchTerm, currentPage]);

    useEffect(() => {
      if (currentShift) {
        setIsLoading(true);
        fetchQueueData();
      }
    }, [currentShift, fetchQueueData]);

    // Reset to the first page whenever the shift or search term changes
    useEffect(() => {
      setCurrentPage(1);
    }, [currentShift?.id, globalSearchTerm]);

    const handleRefresh = useCallback(() => {
      fetchQueueData();
    }, [fetchQueueData]);

    // Imperative append used right after registration, avoiding a full refetch
    const appendPatientToQueue = useCallback((newPatient: PatientLabQueueItem) => {
      setQueueItems((prevItems) => {
        const alreadyQueued = prevItems.some((item) => item.visit_id === newPatient.visit_id);
        return alreadyQueued ? prevItems : [newPatient, ...prevItems];
      });

      setMeta((prevMeta) => (prevMeta ? { ...prevMeta, total: prevMeta.total + 1 } : prevMeta));
    }, []);

    React.useImperativeHandle(ref, () => ({
      appendPatientToQueue,
      refresh: handleRefresh,
    }));

    return (
      <div className="flex h-full flex-col">
        <QueueHeader
          currentShift={currentShift}
          patientCount={queueItems.length}
          onShiftChange={onShiftChange}
          onRefreshQueue={handleRefresh}
          isLoading={isFetching || isLoading}
        />

        <div className="relative min-h-0 flex-grow overflow-hidden">
          {isLoading && currentPage === 1 && !isFetching && <QueueLoadingOverlay />}
          {isFetching && queueItems.length > 0 && <QueueRefreshingBar />}
          {error && <QueueErrorState message={error.message} />}
          {!isLoading && queueItems.length === 0 && !error && <QueueEmptyState hasSearchTerm={!!globalSearchTerm} />}

          {queueItems.length > 0 && (
            <ScrollArea className="h-full">
              <ul className="flex list-none flex-wrap content-start items-start justify-center gap-2 p-2">
                {queueItems.map((item) => (
                  <li key={`${currentShift?.id || "no-shift"}-${item.visit_id}-${item.sample_id || item.lab_request_ids[0] || "no-sample"}`}>
                    <PatientLabReceptionItem
                      appearanceSettings={appearanceSettings}
                      item={item}
                      isSelected={selectedVisitId === item.visit_id}
                      onSelect={() => onPatientSelect(item)}
                      allRequestsPaid={item.all_requests_paid || false}
                      showNewLabRequestBadge={newLabRequestVisitIds?.has(item.visit_id) ?? false}
                      onSendWhatsAppText={() => {}}
                      onSendPdfToPatient={() => {}}
                      onSendPdfToCustomNumber={() => {}}
                      onToggleResultLock={() => {}}
                    />
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }
);

LabPatientQueue.displayName = "LabPatientQueue";

export default LabPatientQueue;
