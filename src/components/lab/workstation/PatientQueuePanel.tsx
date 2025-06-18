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
import { getLabPendingQueue } from '@/services/labWorkflowService';
// format from date-fns no longer needed here if date is not primary filter when shift is present

interface PatientQueuePanelProps {
  currentShift: Shift | null; // The shift whose patients we want to display
  onShiftChange: (direction: 'next' | 'prev') => void;
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  globalSearchTerm: string;
}

const PatientQueuePanel: React.FC<PatientQueuePanelProps> = ({
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm
}) => {
  const { t } = useTranslation(['labResults', 'common']);
  const queryClient = useQueryClient(); // For manual refresh
  const [currentPage, setCurrentPage] = useState(1);

  // Query key now primarily depends on currentShift.id if available
  const queueQueryKey = ['labPendingQueue', currentShift?.id, globalSearchTerm, currentPage] as const;

  const {
    data: paginatedQueue,
    isLoading,
    error,
    isFetching,
    refetch: refetchQueue
  } = useQuery<PaginatedPatientLabQueueResponse, Error>({
    queryKey: ['labPendingQueue', currentShift?.id, globalSearchTerm, currentPage] as const,
    queryFn: () => {
      const filters: any = {
        search: globalSearchTerm,
        page: currentPage,
        per_page: 50, // Fetch more items if using flexbox to allow wrapping
      };
 
        filters.shift_id = currentShift?.id;
      
      return getLabPendingQueue(filters);
    },
    placeholderData: keepPreviousData,
    enabled: !!currentShift, // Only enable if a shift is selected/available
  });

  // Reset page if filters (shift or search term) change
  useEffect(() => {
    setCurrentPage(1);
  }, [currentShift?.id, globalSearchTerm]);

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
                  key={item.visit_id + (item.sample_id || '')}
                  item={item}
                  isSelected={selectedVisitId === item.visit_id}
                  onSelect={() => onPatientSelect(item)}
                  allRequestsPaid={(item as any).all_requests_paid} // Ensure backend provides this
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