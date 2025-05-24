// src/components/lab/workstation/PatientQueuePanel.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import QueueHeader from './QueueHeader';
import PatientLabRequestItem from './PatientLabRequestItem';
import type { Shift } from '@/types/shifts';
import type { PatientLabQueueItem, PaginatedPatientLabQueueResponse } from '@/types/labWorkflow';
import { getLabPendingQueue } from '@/services/labWorkflowService';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface PatientQueuePanelProps {
  currentShift: Shift | null; // Current general clinic shift
  onShiftChange: (direction: 'next' | 'prev') => void; // To navigate shifts
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null; // To highlight selected patient
  globalSearchTerm: string;
  // selectedDate: string; // YYYY-MM-DD, if date can be changed from header
  // onDateChange: (date: string) => void;
}

const PatientQueuePanel: React.FC<PatientQueuePanelProps> = ({
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm
}) => {
  const { t } = useTranslation(['labResults', 'common']);
  const [currentPage, setCurrentPage] = useState(1);
  // For this panel, date is typically today or tied to currentShift.
  // If date can be changed independently, manage it here or pass as prop.
  const [currentDisplayDate, setCurrentDisplayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);

  // Update dateRange if currentShift changes (e.g., when app loads current open shift)
  useEffect(() => {
    if (!dateRange) { // Only update if dateRange is not set
      if (currentShift?.created_at) {
        const shiftDate = new Date(currentShift.created_at);
        setDateRange({ from: shiftDate, to: shiftDate });
      } else {
        const today = new Date();
        setDateRange({ from: today, to: today });
      }
    }
  }, [currentShift, dateRange]);

  const queueQueryKey = ['labPendingQueue', currentDisplayDate, currentShift?.id, globalSearchTerm, currentPage] as const;
  const { 
     data: paginatedQueue, 
     isLoading, 
     error, 
     isFetching 
 } = useQuery<PaginatedPatientLabQueueResponse, Error>({
    queryKey: queueQueryKey,
    queryFn: () => getLabPendingQueue({
      date: currentDisplayDate,
      shift_id: currentShift?.id,
      search: globalSearchTerm,
      page: currentPage,
    }),
    placeholderData: keepPreviousData,
    // refetchInterval: 30000, // Poll for new requests every 30 seconds
  });
  
  // Reset page if filters change
  useEffect(() => {
     setCurrentPage(1);
  }, [currentDisplayDate, currentShift?.id, globalSearchTerm]);

  const queueItems = paginatedQueue?.data || [];
  const meta = paginatedQueue?.meta;

  return (
    <div className="h-full flex flex-col">
      <QueueHeader 
        currentShift={currentShift}
        patientCount={meta?.total || 0}
        onShiftChange={onShiftChange}
        currentDate={currentDisplayDate}
        onDateChange={setCurrentDisplayDate} // Basic date change, might need better date picker
      />
      <div className="flex-grow overflow-hidden relative"> {/* For absolute positioning of loader */}
        {isLoading && currentPage === 1 && !isFetching && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {isFetching && queueItems.length > 0 && ( /* Small fetching indicator if list already has items */
             <div className="p-1 text-xs text-center text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin"/> {t('common:updatingList')}</div>
        )}

        {error && (
          <div className="p-4 text-center text-destructive">
             <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
             {t('common:error.fetchFailed', {entity: t('labResults:queue')})}
             <p className="text-xs mt-1">{error.message}</p>
          </div>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && (
          <div className="p-6 text-center text-muted-foreground flex-grow flex flex-col justify-center items-center">
             <Users className="h-12 w-12 text-muted-foreground/30 mb-3"/>
             {globalSearchTerm ? t('common:noResultsFound') : t('labResults:queue.noPending')}
          </div>
        )}
        

        {queueItems.length > 0 && (
          <ScrollArea className="h-full"> {/* Ensure ScrollArea takes available space */}
            <div className="p-2 space-y-1.5">
              {queueItems.map((item) => (
                <PatientLabRequestItem
                  key={item.visit_id} // Or a more unique key if visit_id can repeat in some edge case
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
          {/* Basic Pagination Buttons */}
          <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!meta.links?.prev || isFetching} size="sm" variant="outline">{t('common:pagination.previous')}</Button>
          <span className="text-xs text-muted-foreground">{t('common:pagination.pageInfoShort', {current: meta.current_page, total: meta.last_page})}</span>
          <Button onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={!meta.links?.next || isFetching} size="sm" variant="outline">{t('common:pagination.next')}</Button>
        </div>
      )}
    </div>
  );
};
export default PatientQueuePanel;