// src/components/lab/workstation/PatientQueuePanel.tsx
import React, { useState, useEffect } from "react";
import {
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";
// import { useTranslation } from 'react-i18next';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, MessageCircle } from "lucide-react";
import echo from "@/services/echoService"; // Added import

import QueueHeader from "./QueueHeader"; // Assumes QueueHeader is updated for shift navigation
import PatientLabRequestItem from "./PatientLabRequestItem";
import type { Shift } from "@/types/shifts";
import type {
  PatientLabQueueItem,
  PaginatedPatientLabQueueResponse,
} from "@/types/labWorkflow";
import type { LabQueueFilters } from "./LabQueueFilterDialog";
import {
  getLabPendingQueue,
  getLabReadyForPrintQueue,
  getLabUnfinishedResultsQueue,
} from "@/services/labWorkflowService";
import type { LabAppearanceSettings } from "@/lib/appearance-settings-store";
// format from date-fns no longer needed here if date is not primary filter when shift is present

interface PatientQueuePanelProps {
  currentShift: Shift | null; // The shift whose patients we want to display
  onShiftChange: (direction: "next" | "prev") => void;
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  globalSearchTerm: string;
  queueFilters?: LabQueueFilters; // Optional filters for the queue
  appearanceSettings: LabAppearanceSettings;
  newPaymentBadges?: Set<number>; // Set of visit IDs that should show new payment badge
  updatedItem?: PatientLabQueueItem | null; // Updated item to replace in the list
  queueItems: PatientLabQueueItem[];
  setQueueItems: (items: PatientLabQueueItem[]) => void;
}

// Helper to normalize phone numbers for matching
const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  // Remove leading zero if present
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  // Prepend 249 if not present (assuming Sudan numbers per user context)
  if (!cleaned.startsWith("249")) {
    cleaned = "249" + cleaned;
  }
  return cleaned;
};

const PatientQueuePanel: React.FC<PatientQueuePanelProps> = ({
  appearanceSettings,
  queueItems,
  setQueueItems,
  currentShift,
  onShiftChange,
  onPatientSelect,
  selectedVisitId,
  globalSearchTerm,
  queueFilters = {},
  newPaymentBadges = new Set(),
  updatedItem,
}) => {
  // const { t } = useTranslation(['labResults', 'common']);
  const queryClient = useQueryClient(); // For manual refresh
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadWhatsAppPhones, setUnreadWhatsAppPhones] = useState<Set<string>>(
    new Set(),
  );

  // Listen for WhatsApp messages to show badges
  useEffect(() => {
    const channel = echo.channel("whatsapp-updates");

    const handleMessage = (payload: any) => {
      // Filter by System Phone Number ID
      if (payload?.message?.phone_number_id !== "982254518296345") {
        return;
      }

      // payload.message.from contains the sender phone number (e.g., 2499123...)
      const from = payload?.message?.from;
      if (from) {
        console.log("🔔 QueuePanel: New WhatsApp from", from);

        // Play notification sound
        try {
          const audio = new Audio(
            "https://freesound.org/data/previews/264/264447_4267329-lq.mp3",
          ); // Short 'ding'
          // Fallback to base64 if we want to be offline-safe, but for now this is quick.
          // Actually, let's use a Data URI to be safe.
          // Simple 'Glass' sound
          const base64Sound =
            "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // truncated...
          // Okay, writing a full base64 in the tool might be verbose.
          // I'll use a generic beep function or the URL.
          // Let's stick to a reliable URL or construct a pure tone using Web Audio API?
          // Web Audio API is cleanest.

          const ctx = new (
            window.AudioContext || (window as any).webkitAudioContext
          )();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = 880; // A5
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.00001,
            ctx.currentTime + 0.5,
          );
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
          console.error("Failed to play notification sound", e);
        }

        setUnreadWhatsAppPhones((prev) => {
          const newSet = new Set(prev);
          newSet.add(from); // Assuming 'from' is already in 249... format from WhatsApp
          return newSet;
        });
      }
    };

    channel.listen(".message.received", handleMessage);

    return () => {
      channel.stopListening(".message.received", handleMessage);
      channel.stopListening(".message.received"); // Just to be safe
    };
  }, []);

  // Query key includes filters so it refetches when filters change
  const queueQueryKey = [
    "labPendingQueue",
    currentShift?.id,
    globalSearchTerm,
    queueFilters,
    currentPage,
  ] as const;

  const {
    data: paginatedQueue,
    isLoading,
    error,
    isFetching,
  } = useQuery<PaginatedPatientLabQueueResponse, Error>({
    queryKey: queueQueryKey,
    queryFn: () => {
      const filters: LabQueueFilters = {
        search: globalSearchTerm,
        page: currentPage,
        per_page: 50,
        shift_id: currentShift?.id,
        // Include all queue filters
        package_id: queueFilters.package_id,
        main_test_id: queueFilters.main_test_id,
        result_status_filter:
          queueFilters.result_status_filter !== "all"
            ? queueFilters.result_status_filter
            : undefined,
        print_status_filter:
          queueFilters.print_status_filter !== "all"
            ? queueFilters.print_status_filter
            : undefined,
        company_id: queueFilters.company_id,
        doctor_id: queueFilters.doctor_id,
        show_unfinished_only: queueFilters.show_unfinished_only,
        ready_for_print_only: queueFilters.ready_for_print_only,
      };

      // Use the appropriate service method based on the filter
      if (queueFilters.ready_for_print_only) {
        return getLabReadyForPrintQueue(filters);
      } else if (queueFilters.show_unfinished_only) {
        return getLabUnfinishedResultsQueue(filters);
      } else {
        return getLabPendingQueue(filters);
      }
    },
    placeholderData: keepPreviousData,
    enabled: !!currentShift, // Only enable if a shift is selected/available
  });

  // Reset page if filters (shift, search term, or queue filters) change
  useEffect(() => {
    setCurrentPage(1);
  }, [currentShift?.id, globalSearchTerm, queueFilters]);

  // console.log(paginatedQueue, "paginatedQueue",queueItems, "queueItems");
  // Initialize queueItems when paginatedQueue data changes
  React.useEffect(() => {
    if (paginatedQueue?.data) {
      // console.log('Initializing queue items:', paginatedQueue.data.length, 'items');
      setQueueItems(paginatedQueue.data);
    }
  }, [paginatedQueue?.data]);

  // Update the specific item in the queue when updatedItem is provided
  React.useEffect(() => {
    if (updatedItem) {
      // console.log('Updating queue item for visit_id:', updatedItem.visit_id, 'with progress:', updatedItem.total_result_count, '/', updatedItem.pending_result_count);
      setQueueItems((prevItems) =>
        prevItems.map((item) =>
          item.visit_id === updatedItem.visit_id ? updatedItem : item,
        ),
      );
    }
  }, [updatedItem]);

  // console.log(queueItems,'queueItems from queue')
  const handleRefresh = () => {
    // Invalidate and refetch the queue
    queryClient.invalidateQueries({
      queryKey: ["labPendingQueue", currentShift?.id],
    });
    // Or directly call refetch:
    // refetchQueue();
  };

  // Debug: Log current queue items
  //  console.log('Current queueItems:', queueItems.length, 'items');
  if (queueItems.length > 0) {
    // console.log('First item progress:', queueItems[0].visit_id, 'has', queueItems[0].total_result_count, 'total,', queueItems[0].pending_result_count, 'pending');
  }
  return (
    <div className="h-[calc(100vh-150px)] flex flex-col">
      <QueueHeader
        currentShift={currentShift}
        patientCount={queueItems.length}
        onShiftChange={onShiftChange} // Passed from LabWorkstationPage
        onRefreshQueue={handleRefresh} // Use local refresh handler
        isLoading={isFetching || isLoading}
      />
      <div className="flex-grow overflow-hidden relative">
        {isLoading && currentPage === 1 && !isFetching && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 dark:bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {isFetching && queueItems.length > 0 && (
          <div className="p-1 text-xs text-center text-muted-foreground border-b">
            <Loader2 className="inline h-3 w-3 animate-spin" /> تحديث القائمة...
          </div>
        )}

        {error /* Error display */ && (
          <div className="p-2 text-xs text-center text-muted-foreground border-b">
            <AlertTriangle className="inline h-3 w-3 animate-spin" /> خطأ في
            تحميل القائمة
          </div>
        )}

        {!isLoading &&
          queueItems.length === 0 &&
          !error /* No items display */ && (
            <div className="p-2 text-xs text-center text-muted-foreground border-b">
              لا توجد عناصر
            </div>
          )}

        {queueItems.length > 0 && (
          <ScrollArea className="h-full">
            {/* Flexbox layout for patient squares */}
            <div className="p-1 flex flex-wrap gap-2 justify-center items-center content-start">
              {queueItems.map((item) => {
                const normalizedItemPhone = normalizePhone(item.phone);
                const hasUnread = unreadWhatsAppPhones.has(normalizedItemPhone);

                return (
                  <PatientLabRequestItem
                    isLastResultPending={item.is_last_result_pending}
                    isReadyForPrint={item.is_ready_for_print}
                    key={`${currentShift?.id || "no-shift"}-${item.visit_id}-${item.sample_id || item.lab_request_ids[0] || "no-sample"}`}
                    appearanceSettings={appearanceSettings}
                    isResultLocked={item.result_is_locked}
                    item={item}
                    isSelected={selectedVisitId === item.visit_id}
                    onSelect={() => {
                      // Clear badge on select
                      if (hasUnread) {
                        setUnreadWhatsAppPhones((prev) => {
                          const next = new Set(prev);
                          next.delete(normalizedItemPhone);
                          return next;
                        });
                      }
                      onPatientSelect(item);
                    }}
                    allRequestsPaid={
                      (item as unknown as { all_requests_paid?: boolean })
                        .all_requests_paid
                    }
                    showNewPaymentBadge={newPaymentBadges.has(item.visit_id)}
                    hasUnreadMessage={hasUnread}
                  />
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
export default PatientQueuePanel;
