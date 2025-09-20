// src/components/lab/workstation/PatientQueuePanel.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
// import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle } from 'lucide-react';

import QueueHeader from './QueueHeader'; // Assumes QueueHeader is updated for shift navigation
import PatientLabRequestItem from './PatientLabRequestItem';
import type { Shift } from '@/types/shifts';
import type { PatientLabQueueItem, PaginatedPatientLabQueueResponse } from '@/types/labWorkflow';
import type { LabQueueFilters } from './LabQueueFilterDialog';
import { getLabPendingQueue, getLabReadyForPrintQueue, getLabUnfinishedResultsQueue } from '@/services/labWorkflowService';
import type { LabAppearanceSettings } from '@/lib/appearance-settings-store';
// format from date-fns no longer needed here if date is not primary filter when shift is present

interface PatientQueuePanelProps {
  currentShift: Shift | null; // The shift whose patients we want to display
  onShiftChange: (direction: 'next' | 'prev') => void;
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  globalSearchTerm: string;
  queueFilters?: LabQueueFilters; // Optional filters for the queue
  appearanceSettings: LabAppearanceSettings;
}

const PatientQueuePanel: React.FC<PatientQueuePanelProps> = ({
  appearanceSettings,
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm, queueFilters = {}
}) => {
  // const { t } = useTranslation(['labResults', 'common']);
  const queryClient = useQueryClient(); // For manual refresh
  const [currentPage, setCurrentPage] = useState(1);

  // Query key includes filters so it refetches when filters change
  const queueQueryKey = ['labPendingQueue', currentShift?.id, globalSearchTerm, queueFilters, currentPage] as const;

  const {
    data: paginatedQueue,
    isLoading,
    error,
    isFetching
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
        result_status_filter: queueFilters.result_status_filter !== 'all' ? queueFilters.result_status_filter : undefined,
        print_status_filter: queueFilters.print_status_filter !== 'all' ? queueFilters.print_status_filter : undefined,
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

  const queueItems = paginatedQueue?.data || [];
  const meta = paginatedQueue?.meta;
  // console.log(queueItems,'queueItems from queue')
  const handleRefresh = () => {
      // Invalidate and refetch the queue
      queryClient.invalidateQueries({ queryKey: ['labPendingQueue', currentShift?.id] });
      // Or directly call refetch:
      // refetchQueue();
  };
  
  return (
    <div className="h-full flex flex-col">
      <QueueHeader
        currentShift={currentShift}
        patientCount={meta?.total || 0}
        onShiftChange={onShiftChange} // Passed from LabWorkstationPage
        onRefreshQueue={handleRefresh} // Use local refresh handler
        isLoading={isFetching || isLoading}
      />
      <div className="flex-grow overflow-hidden relative">
        {(isLoading && currentPage === 1 && !isFetching) && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 dark:bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {(isFetching && queueItems.length > 0) && (
            <div className="p-1 text-xs text-center text-muted-foreground border-b">
                <Loader2 className="inline h-3 w-3 animate-spin"/> تحديث القائمة...
            </div>
        )}

        {error && ( /* Error display */
          <div className="p-2 text-xs text-center text-muted-foreground border-b">
            <AlertTriangle className="inline h-3 w-3 animate-spin"/> خطأ في تحميل القائمة
          </div>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && ( /* No items display */
          <div className="p-2 text-xs text-center text-muted-foreground border-b">
            لا توجد عناصر
          </div>
        )}

        {queueItems.length > 0 && (
          <ScrollArea className="h-full">
            {/* Flexbox layout for patient squares */}
            <div className="p-2 flex flex-wrap gap-2 justify-start items-start content-start">
              {queueItems.map((item) => (
                <PatientLabRequestItem
                  isLastResultPending={item.is_last_result_pending}
                  isReadyForPrint={item.is_ready_for_print}
                  key={`${currentShift?.id || 'no-shift'}-${item.visit_id}-${item.sample_id || item.lab_request_ids[0] || 'no-sample'}`}
                  appearanceSettings={appearanceSettings}
                  isResultLocked={item.result_is_locked}
                  item={item}
                  isSelected={selectedVisitId === item.visit_id}
                  onSelect={() => onPatientSelect(item)}
                  allRequestsPaid={(item as unknown as { all_requests_paid?: boolean }).all_requests_paid}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    
    </div>
  );
};
export default PatientQueuePanel;