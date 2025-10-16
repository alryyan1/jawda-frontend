// src/components/lab/reception/LabPatientQueue.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, Users } from 'lucide-react';


import QueueHeader from '@/components/lab/workstation/QueueHeader'; // Reusable header component
import PatientLabRequestItem from '@/components/lab/workstation/PatientLabRequestItem'; // Reusable patient square component
import type { Shift } from '@/types/shifts';
import type { PatientLabQueueItem, LabQueueFilters } from '@/types/labWorkflow';
import { getNewlyRegisteredLabPendingQueue } from '@/services/labWorkflowService';
import type { LabAppearanceSettings } from '@/lib/appearance-settings-store';
import showJsonDialog from '@/lib/showJsonDialog';

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

export interface LabPatientQueueRef {
  appendPatientToQueue: (patient: PatientLabQueueItem) => void;
  refresh: () => void;
}

const LabPatientQueue = React.forwardRef<LabPatientQueueRef, LabPatientQueueProps>(({
  appearanceSettings,
  currentShift, onShiftChange, onPatientSelect, selectedVisitId, globalSearchTerm, labFilters, filters
}, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [queueItems, setQueueItems] = useState<PatientLabQueueItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch queue data function
  const fetchQueueData = useCallback(async () => {
    if (!currentShift) return;
    
    setIsFetching(true);
    setError(null);
    
    try {
      // Use either labFilters or filters prop
      const activeFilters = labFilters || filters || {};
      
      const requestFilters: LabQueueFilters & { search?: string; page?: number; per_page?: number; shift_id?: number } = {
        ...activeFilters,
        search: globalSearchTerm,
        page: currentPage,
        per_page: 50, // Fetch a good number of items for the flexbox layout
      };
      if (currentShift?.id) {
        requestFilters.shift_id = currentShift.id;
      }
      
      const paginatedQueue = await getNewlyRegisteredLabPendingQueue(requestFilters);
      // showJsonDialog(paginatedQueue);
      setQueueItems(paginatedQueue.data);
      setMeta(paginatedQueue.meta);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching queue data:', err);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [currentShift, labFilters, filters, globalSearchTerm, currentPage]);

  // Initial load and when dependencies change
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

  // Method to append a new patient to the queue (for real-time updates)
  const appendPatientToQueue = useCallback((newPatient: PatientLabQueueItem) => {
    setQueueItems(prevItems => {
      // Check if patient already exists to avoid duplicates
      const existingPatient = prevItems.find(item => item.visit_id === newPatient.visit_id);
      if (existingPatient) {
        return prevItems; // Patient already exists, no need to add
      }
      
      // Add the new patient to the beginning of the queue
      return [newPatient, ...prevItems];
    });
    
    // Update the total count
    setMeta(prevMeta => {
      if (!prevMeta) return prevMeta;
      return {
        ...prevMeta,
        total: prevMeta.total + 1
      };
    });
  }, []);

  // Expose the appendPatientToQueue method via ref
  React.useImperativeHandle(ref, () => ({
    appendPatientToQueue,
    refresh: handleRefresh
  }));

  // console.log(queueItems,'queueItems from queue')
  return (
    <div className="h-full flex flex-col">
      <QueueHeader
        currentShift={currentShift}
        patientCount={queueItems.length}
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
                <Loader2 className="inline h-3 w-3 animate-spin"/> جاري تحديث القائمة
            </div>
        )}

        {error && (
          <div className="p-4 text-center text-destructive">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
            <p className="font-semibold">فشل في جلب بيانات  المرضى</p>
            <p className="text-xs mt-1">{error.message}</p>
          </div>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && (
          <div className="p-6 text-center text-muted-foreground flex-grow flex flex-col justify-center items-center">
            <Users className="h-12 w-12 text-muted-foreground/20 mb-3"/>
            <p className="font-medium">
                {globalSearchTerm ? 'لا توجد نتائج' : 'لا يوجد مرضى في  لهذه الوردية.'}
            </p>
            <p className="text-xs mt-1">
                استخدم نموذج التسجيل لإضافة مريض جديد.
            </p>
          </div>
        )}

        {queueItems.length > 0 && (
          <ScrollArea className="h-[calc(100vh-300px)] overflow-y-auto ">
            <div className="p-2 flex flex-wrap gap-2 justify-center items-start content-start">
              {queueItems.map((item) => (
                <PatientLabRequestItem
                  appearanceSettings={appearanceSettings}
                  key={`${currentShift?.id || 'no-shift'}-${item.visit_id}-${item.sample_id || item.lab_request_ids[0] || 'no-sample'}`}
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
});

LabPatientQueue.displayName = 'LabPatientQueue';

export default LabPatientQueue;