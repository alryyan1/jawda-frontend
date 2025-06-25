// src/components/lab/workstation/PatientQueuePanel.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button'; // shadcn Button

import QueueHeader from './QueueHeader'; // Assumes QueueHeader is updated for shift navigation
import PatientLabRequestItem from './PatientLabRequestItem';
import type { Shift } from '@/types/shifts';
import type { PatientLabQueueItem, PaginatedPatientLabQueueResponse } from '@/types/labWorkflow';
import type { LabQueueFilters } from './LabQueueFilterDialog';
import { getLabPendingQueue } from '@/services/labWorkflowService';
// format from date-fns no longer needed here if date is not primary filter when shift is present

interface PatientQueuePanelProps {
  currentShift: Shift | null; // The shift whose patients we want to display
  onShiftChange: (direction: 'next' | 'prev') => void;
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  globalSearchTerm: string;
  queueFilters?: LabQueueFilters; // Optional filters for the queue
  onSendWhatsAppText: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToPatient: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToCustomNumber: (queueItem: PatientLabQueueItem) => void;
  onToggleResultLock: (queueItem: PatientLabQueueItem) => void;
}

const PatientQueuePanel: React.FC<PatientQueuePanelProps> = ({
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm, queueFilters = {}, onSendWhatsAppText, onSendPdfToPatient, onSendPdfToCustomNumber, onToggleResultLock
}) => {
  const { t } = useTranslation(['labResults', 'common']);
  const queryClient = useQueryClient(); // For manual refresh
  const [currentPage, setCurrentPage] = useState(1);

  // Query key includes filters so it refetches when filters change
  const queueQueryKey = ['labPendingQueue', currentShift?.id, globalSearchTerm, queueFilters, currentPage] as const;

  const {
    data: paginatedQueue,
    isLoading,
    error,
    isFetching,
    refetch: refetchQueue
  } = useQuery<PaginatedPatientLabQueueResponse, Error>({
    queryKey: queueQueryKey,
    queryFn: () => {
      const filters: {
        search?: string;
        page?: number;
        per_page?: number;
        shift_id?: number;
        package_id?: string | null;
        main_test_id?: string | null;
        result_status_filter?: string;
        print_status_filter?: string;
        company_id?: string | null;
        doctor_id?: string | null;
      } = {
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
      };
      
      return getLabPendingQueue(filters);
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
                <Loader2 className="inline h-3 w-3 animate-spin"/> {t('common:updatingList')}
            </div>
        )}

        {error && ( /* Error display */
          <div className="p-2 text-xs text-center text-muted-foreground border-b">
            <AlertTriangle className="inline h-3 w-3 animate-spin"/> {t('common:errorLoadingList')}
          </div>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && ( /* No items display */
          <div className="p-2 text-xs text-center text-muted-foreground border-b">
            {t('common:noItemsFound')}
          </div>
        )}

        {queueItems.length > 0 && (
          <ScrollArea className="h-full">
            {/* Flexbox layout for patient squares */}
            <div className="p-2 flex flex-wrap gap-2 justify-start items-start content-start">
              {queueItems.map((item) => (
                <PatientLabRequestItem
                 isResultLocked={item.result_is_locked}
                  key={item.visit_id + (item.sample_id || '')}
                  item={item}
                  isSelected={selectedVisitId === item.visit_id}
                  onSelect={() => onPatientSelect(item)}
                  allRequestsPaid={(item as unknown as { all_requests_paid?: boolean }).all_requests_paid}
                  onSendWhatsAppText={onSendWhatsAppText}
                  onSendPdfToPatient={onSendPdfToPatient}
                  onSendPdfToCustomNumber={onSendPdfToCustomNumber}
                  onToggleResultLock={onToggleResultLock}
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