// src/components/lab/sample_collection/PatientQueuePanelSC.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

import QueueHeader from '@/components/lab/workstation/QueueHeader'; // Reusable header
import PatientLabRequestItem from '@/components/lab/workstation/PatientLabRequestItem'; // Reusable item display
import type { Shift } from '@/types/shifts';
import type { PatientLabQueueItem, PaginatedPatientLabQueueResponse } from '@/types/labWorkflow';
import type { LabAppearanceSettings } from '@/lib/appearance-settings-store';
import { getSampleCollectionQueue } from '@/services/sampleCollectionService'; // Specific service for this queue
import { getPatientById } from '@/services/patientService'; // To fetch patient data for context menu

interface PatientQueuePanelSCProps {
  currentShift: Shift | null;
  onShiftChange: (direction: 'next' | 'prev') => void;
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  globalSearchTerm: string;
  appearanceSettings: LabAppearanceSettings;

  // Context Menu Action Callbacks
  onSendWhatsAppText: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToPatient: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToCustomNumber: (queueItem: PatientLabQueueItem) => void;
  onToggleResultLock: (queueItem: PatientLabQueueItem) => void;
}

const PatientQueuePanelSC: React.FC<PatientQueuePanelSCProps> = ({
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm, appearanceSettings,
  onSendWhatsAppText, onSendPdfToPatient, onSendPdfToCustomNumber, onToggleResultLock
}) => {
  const { t } = useTranslation(['labSampleCollection', 'labResults', 'common']);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const queueQueryKey = ['sampleCollectionQueue', currentShift?.id, globalSearchTerm, currentPage] as const;

  const { data: paginatedQueue, isLoading, error, isFetching, refetch } = useQuery<PaginatedPatientLabQueueResponse, Error>({
    queryKey: queueQueryKey,
    queryFn: () => {
      const filters: any = {
        search: globalSearchTerm,
        page: currentPage,
        per_page: 50, // Fetch more for flex wrap display
      };
      if (currentShift?.id) {
        filters.shift_id = currentShift.id;
      } else {
        // If no shift selected, default to today's date for sample collection queue
        const today = new Date().toISOString().split('T')[0];
        filters.date_from = today;
        filters.date_to = today;
      }
      return getSampleCollectionQueue(filters);
    },
    placeholderData: keepPreviousData,
    enabled: !!currentShift, // Typically, a shift context is required for a queue
  });

  useEffect(() => { setCurrentPage(1); }, [currentShift?.id, globalSearchTerm]);

  const queueItems = paginatedQueue?.data || [];
  const meta = paginatedQueue?.meta;

  const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ['sampleCollectionQueue', currentShift?.id] });
      // refetch(); // Direct refetch also works
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
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 dark:bg-background/80 z-10">
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
             {t('common:error.fetchFailed', {entity: t('labSampleCollection:queueTitle')})}
             <p className="text-xs mt-1">{error.message}</p>
          </div>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
             <Users className="h-12 w-12 text-muted-foreground/30 mb-3"/>
             {globalSearchTerm ? t('common:noResultsFound') : 
                currentShift ? t('labSampleCollection:queue.noPendingSamplesForShift') : t('labSampleCollection:queue.selectShiftPrompt')}
          </div>
        )}

        {queueItems.length > 0 && (
          <ScrollArea className="h-full">
            <div className="p-2 flex flex-wrap gap-2 justify-start items-start content-start">
              {queueItems.map((item) => (
                <PatientLabRequestItem
                  key={`${item.visit_id}-${item.patient_id}`} // Use patient_id too for robustness
                  item={item}
                  isSelected={selectedVisitId === item.visit_id}
                  onSelect={() => onPatientSelect(item)}
                  allRequestsPaid={(item as any).all_requests_paid_for_badge} // From backend resource (PatientLabQueueItemResource)
                  isResultLocked={(item as any).is_result_locked} // From backend resource
                  appearanceSettings={appearanceSettings}
                  // Pass context menu actions
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
      {meta && meta.last_page > 1 && (
        <div className="p-2 border-t flex-shrink-0 flex items-center justify-between">
          <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching} size="sm" variant="outline">{t('common:pagination.previous')}</Button>
          <span className="text-xs text-muted-foreground">{t('common:pagination.pageInfoShort', {current: meta.current_page, total: meta.last_page})}</span>
          <Button onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={currentPage === meta.last_page || isFetching} size="sm" variant="outline">{t('common:pagination.next')}</Button>
        </div>
      )}
    </div>
  );
};
export default PatientQueuePanelSC;