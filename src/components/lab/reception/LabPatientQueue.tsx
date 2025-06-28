// src/components/lab/reception/LabPatientQueue.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Users } from 'lucide-react';


import QueueHeader from '@/components/lab/workstation/QueueHeader'; // Reusable header component
import PatientLabRequestItem from '@/components/lab/workstation/PatientLabRequestItem'; // Reusable patient square component
import type { Shift } from '@/types/shifts';
import type { PatientLabQueueItem, PaginatedPatientLabQueueResponse, LabQueueFilters } from '@/types/labWorkflow';
import { getNewlyRegisteredLabPendingQueue } from '@/services/labWorkflowService';
import type { LabAppearanceSettings } from '@/lib/appearance-settings-store';

interface LabPatientQueueProps {
  currentShift: Shift | null;
  onShiftChange: (direction: 'next' | 'prev') => void;
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  globalSearchTerm: string;
  labFilters?: LabQueueFilters;
  filters?: LabQueueFilters; // Alternative prop name for compatibility
  appearanceSettings: LabAppearanceSettings;
}

const LabPatientQueue: React.FC<LabPatientQueueProps> = ({
  appearanceSettings,
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm, labFilters, filters
}) => {
  const { t } = useTranslation(['labResults', 'common', 'labReception']);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Use either labFilters or filters prop
  const activeFilters = labFilters || filters || {};
  console.log(activeFilters,'activeFilters from queue')
  
  // Use a query key specific to this queue to avoid conflicts with other queues
  const queueQueryKey = ['labReceptionQueue', currentShift?.id, globalSearchTerm, currentPage, activeFilters] as const;

  const { data: paginatedQueue, isLoading, error, isFetching } = useQuery<PaginatedPatientLabQueueResponse, Error>({
    queryKey: queueQueryKey,
    queryFn: () => {
      const filters: LabQueueFilters & { search?: string; page?: number; per_page?: number; shift_id?: number } = {
        ...activeFilters,
        search: globalSearchTerm,
        page: currentPage,
        per_page: 50, // Fetch a good number of items for the flexbox layout
      };
      if (currentShift?.id) {
        filters.shift_id = currentShift.id;
      }
      // The backend method getNewlyRegisteredLabPendingQueue will default to today if no shift_id is provided
      return getNewlyRegisteredLabPendingQueue(filters);
    },
    placeholderData: keepPreviousData, // Smooth pagination experience
    enabled: !!currentShift, // Only run the query if there is an active shift context
  });

  // Reset to the first page whenever the shift or search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentShift?.id, globalSearchTerm]);

  const queueItems = paginatedQueue?.data || [];
  const meta = paginatedQueue?.meta;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['labReceptionQueue', currentShift?.id] });
  };

  return (
    <div className="h-full flex flex-col">
      <QueueHeader
        currentShift={currentShift}
        patientCount={meta?.total || 0}
        onShiftChange={onShiftChange}
        onRefreshQueue={handleRefresh}
        isLoading={isFetching || isLoading}
      />
      <div className="flex-grow overflow-hidden relative">
        {(isLoading && currentPage === 1 && !isFetching) && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 dark:bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {(isFetching && queueItems.length > 0) && (
            <div className="p-1 text-xs text-center text-muted-foreground border-b">
                <Loader2 className="inline h-3 w-3 animate-spin"/> {t('common:updatingList')}
            </div>
        )}

        {error && (
          <div className="p-4 text-center text-destructive">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
            <p className="font-semibold">{t('common:error.fetchFailed', {entity: t('labReception:queueTitle', "Patient Queue")})}</p>
            <p className="text-xs mt-1">{error.message}</p>
          </div>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && (
          <div className="p-6 text-center text-muted-foreground flex-grow flex flex-col justify-center items-center">
            <Users className="h-12 w-12 text-muted-foreground/20 mb-3"/>
            <p className="font-medium">
                {globalSearchTerm 
                    ? t('common:noResultsFound') 
                    : t('labReception:noPatientsInQueue', "No patients in queue for this shift.")
                }
            </p>
            <p className="text-xs mt-1">
                {t('labReception:useFormToAdd', "Use the registration form to add a new patient.")}
            </p>
          </div>
        )}

        {queueItems.length > 0 && (
          <ScrollArea className="h-[calc(100vh-200px)] overflow-y-auto ">
            <div className="p-2 flex flex-wrap gap-2 justify-start items-start content-start">
              {queueItems.map((item) => (
                <PatientLabRequestItem
                  appearanceSettings={appearanceSettings}
                  key={item.visit_id + (item.sample_id || '')}
                  item={item}
                  isSelected={selectedVisitId === item.visit_id}
                  onSelect={() => onPatientSelect(item)}
                  allRequestsPaid={item.all_requests_paid || false}
                  onSendWhatsAppText={() => {}} // Not needed in reception queue
                  onSendPdfToPatient={() => {}} // Not needed in reception queue
                  onSendPdfToCustomNumber={() => {}} // Not needed in reception queue
                  onToggleResultLock={() => {}} // Not needed in reception queue
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
  
    </div>
  );
};
export default LabPatientQueue;