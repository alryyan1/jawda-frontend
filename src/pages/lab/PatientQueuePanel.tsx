// src/components/lab/workstation/PatientQueuePanel.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import QueueHeader from '@/components/lab/workstation/QueueHeader';
import type { Shift } from '@/types/shifts';
import type { PatientLabQueueItem, PaginatedPatientLabQueueResponse } from '@/types/labWorkflow';
import { getLabPendingQueue } from '@/services/labWorkflowService';
import { Button } from '@/components/ui/button';
import PatientLabRequestItem from '@/components/lab/workstation/PatientLabRequestItem';

interface PatientQueuePanelProps {
  currentShift: Shift | null;
  onShiftChange: (direction: 'next' | 'prev') => void;
  onPatientSelect: (queueItem: PatientLabQueueItem | null) => void; // Allow deselecting
  selectedVisitId: number | null;
  globalSearchTerm: string;
}

const PatientQueuePanel: React.FC<PatientQueuePanelProps> = ({
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm
}) => {
  const { t } = useTranslation(['labResults', 'common']);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Date range for filtering the queue
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(), // Default to today
    to: new Date(),   // Default to today
  });

  // Update dateRange if currentShift changes (e.g., when app loads current open shift)
  useEffect(() => {
    if (currentShift?.created_at) { // Assuming created_at is the start of the shift day
      const shiftDate = new Date(currentShift.created_at);
      setDateRange({ from: shiftDate, to: shiftDate });
    } else if(!currentShift) { // If no shift, default to today
      const today = new Date();
      setDateRange({ from: today, to: today });
    }
  }, [currentShift]);


  const queueQueryKey = ['labPendingQueue', 
    dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
    dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
    currentShift?.id, // Or a general clinic shift ID if applicable
    globalSearchTerm, 
    currentPage
  ] as const;

  const { 
    data: paginatedQueue, 
    isLoading, 
    error, 
    isFetching,
    refetch: refetchQueue // To manually refresh
  } = useQuery<PaginatedPatientLabQueueResponse, Error>({
    queryKey: queueQueryKey,
    queryFn: () => getLabPendingQueue({
      date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      shift_id: currentShift?.id, // Pass general clinic shift ID if relevant
      search: globalSearchTerm,
      page: currentPage,
    }),
    placeholderData: keepPreviousData,
    // enabled: !!(dateRange?.from), // Fetch only if a date is selected
  });
  
  useEffect(() => { // Reset page if filters change
    setCurrentPage(1);
  }, [dateRange, currentShift?.id, globalSearchTerm]);

  const queueItems = paginatedQueue?.data || [];
  const meta = paginatedQueue?.meta;

  return (
    <div className="h-full flex flex-col">
      <QueueHeader 
        currentShift={currentShift}
        patientCount={meta?.total || 0}
        onShiftChange={onShiftChange} // Pass through for now
        currentDateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefreshQueue={() => queryClient.invalidateQueries({ queryKey: queueQueryKey })}
        isLoading={isFetching}
      />
      <div className="flex-grow overflow-hidden relative">
        {isLoading && currentPage === 1 && !isFetching && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 dark:bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {isFetching && queueItems.length > 0 && (
            <div className="p-1 text-xs text-center text-muted-foreground border-b">
                <Loader2 className="inline h-3 w-3 animate-spin"/> {t('common:updatingList')}
            </div>
        )}

        {error && (
          <div className="p-4 text-center text-destructive">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
            {t('common:error.fetchFailed', {entity: t('labResults:queueHeader.patientsInQueue', {count: ''})})}
            <p className="text-xs mt-1">{error.message}</p>
          </div>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && (
          <div className="p-6 text-center text-muted-foreground flex-grow flex flex-col justify-center items-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3"/>
            {globalSearchTerm || (dateRange?.from && format(dateRange.from, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) 
              ? t('common:noResultsFound') 
              : t('labResults:queue.noPending')}
          </div>
        )}

        {queueItems.length > 0 && (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1.5">
              {queueItems.map((item) => (
                <PatientLabRequestItem
                  key={item.visit_id + (item.sample_id || '')} // More robust key
                  item={item}
                  isSelected={selectedVisitId === item.visit_id}
                  onSelect={() => onPatientSelect(item)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      {meta && meta.last_page > 1 && (
        <div className="p-2 border-t flex-shrink-0 flex items-center justify-between">
          <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!meta.links?.prev || isFetching} size="sm" variant="outline">{t('common:pagination.previous')}</Button>
          <span className="text-xs text-muted-foreground">{t('common:pagination.pageInfoShort', {current: meta.current_page, total: meta.last_page})}</span>
          <Button onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={!meta.links?.next || isFetching} size="sm" variant="outline">{t('common:pagination.next')}</Button>
        </div>
      )}
    </div>
  );
};
export default PatientQueuePanel;