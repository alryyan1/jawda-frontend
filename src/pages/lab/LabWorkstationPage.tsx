import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FlaskConical, Loader2, Users, Microscope, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Toaster } from "@/components/ui/sonner"; // Assuming sonner for toasts

// Import Panel Components
import PatientQueuePanel from '@/components/lab/workstation/PatientQueuePanel';

// Import Types
import type { PatientLabQueueItem } from '@/types/labWorkflow';
import type { Shift } from '@/types/shifts';

// Import Services
import { getCurrentOpenShift } from '@/services/shiftService';
import TestSelectionPanel from './TestSelectionPanel';
import ResultEntryPanel from '@/components/lab/workstation/ResultEntryPanel';
import StatusAndInfoPanel from '@/components/lab/workstation/StatusAndInfoPanel';
import LabActionsPane from '@/components/lab/workstation/LabActionsPane';
import type { LabRequest } from '@/types/visits';
import { format } from 'date-fns';
// Other services will be called within the panel components themselves

const LabWorkstationPage: React.FC = () => {
  const { t, i18n } = useTranslation(['labResults', 'common', 'labTests', 'patients', 'payments']);
  const queryClient = useQueryClient();
  
  // --- Top Level State for the Workstation ---
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = useState('');
  
  const [selectedQueueItem, setSelectedQueueItem] = useState<PatientLabQueueItem | null>(null);
  const [selectedLabRequestForEntry, setSelectedLabRequestForEntry] = useState<LabRequest | null>(null); 

  // Fetch current open general clinic shift - this provides context for the lab day
  const { 
    data: currentClinicShift, 
    isLoading: isLoadingShift,
    error: shiftError,
    refetch: refetchCurrentShift 
  } = useQuery<Shift | null, Error>({
    queryKey: ['currentOpenShiftForLabWorkstation'],
    queryFn: getCurrentOpenShift,
    // staleTime: 5 * 60 * 1000, // Example: Cache for 5 minutes
  });

  // Debounce the global search term for PatientQueuePanel
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedGlobalSearch(globalSearchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [globalSearchTerm]);

  // --- Callbacks for Child Components to Update Page State ---
  const handlePatientSelect = useCallback((queueItem: PatientLabQueueItem | null) => {
    setSelectedQueueItem(queueItem);
    setSelectedLabRequestForEntry(null); // Always clear specific test when patient changes
  }, []);

  const handleTestSelectForEntry = useCallback((labRequest: LabRequest | null) => {
    setSelectedLabRequestForEntry(labRequest);
  }, []);

  const handleResultsSaved = useCallback(() => {
    toast.success(t('labResults:resultEntry.resultsSavedGlobally'));
    // Invalidate queries to refresh data across panels
    if (selectedQueueItem) {
      queryClient.invalidateQueries({ queryKey: ['labRequestsForVisit', selectedQueueItem.visit_id] });
    }
    if (selectedLabRequestForEntry) {
      queryClient.invalidateQueries({ queryKey: ['labRequestForEntry', selectedLabRequestForEntry.id] });
    }
    // Potentially invalidate the main queue if statuses changed that would affect its listing
    queryClient.invalidateQueries({ 
      queryKey: ['labPendingQueue', 
        currentClinicShift?.created_at ? format(new Date(currentClinicShift.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), // Date part of queue key
        currentClinicShift?.id, 
        debouncedGlobalSearch
      ] 
    });
  }, [queryClient, t, selectedQueueItem, selectedLabRequestForEntry, currentClinicShift, debouncedGlobalSearch]);

  const handleShiftNavigationInQueue = useCallback((direction: 'next' | 'prev') => {
    console.log("Shift navigation requested from QueueHeader:", direction);
    // This is complex: requires backend logic to find prev/next *open* general clinic shifts
    // and then update `currentClinicShift` state here (likely via another query/mutation).
    // For now, just refetching the "current open" one if that's what your API does.
    refetchCurrentShift();
    toast.info(t('labResults:shiftNavigationNotImplemented'));
  }, [refetchCurrentShift, t]);

  const isRTL = i18n.dir() === 'rtl';

  // Determine visibility of panels for dynamic layout and placeholder messages
  const showTestSelectionPanel = !!selectedQueueItem;
  const showStatusAndInfoPanel = !!selectedQueueItem;

  if (isLoadingShift) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ltr:ml-3 rtl:mr-3 text-muted-foreground">{t('common:loadingShiftInfo')}</p>
        </div>
    );
  }
  if (shiftError) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-destructive p-6">
            <AlertTriangle className="h-12 w-12 mb-4"/>
            <p className="font-semibold">{t('common:error.criticalError')}</p>
            <p>{t('common:error.failedToLoadShift')}</p>
            <p className="text-xs mt-1">{shiftError.message}</p>
            <Button onClick={() => refetchCurrentShift()} className="mt-4">{t('common:retry')}</Button>
        </div>
    );
  }
  // It's possible no shift is open, which is a valid state.
  // currentClinicShift might be null here. PatientQueuePanel should handle this.

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 text-sm overflow-hidden">
      {/* Top Section: Title & Global Search */}
      <header className="flex-shrink-0 h-[70px] p-3 border-b bg-card flex items-center justify-between gap-x-4 shadow-sm dark:border-slate-800">
        <div className="flex items-center gap-3">
            <FlaskConical className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('labResults:pageTitle')}</h1>
        </div>
        <div className="relative flex-grow max-w-xs sm:max-w-sm md:max-w-md">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <Input
              type="search"
              placeholder={t('labResults:globalSearchPlaceholder')}
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className="ps-10 rtl:pr-10 h-10 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 border-slate-300 dark:border-slate-700"
            />
        </div>
        {/* Placeholder for other header actions (e.g., quick stats, user menu if not in AppLayout) */}
        <div className="w-1/6 hidden lg:block"></div> 
      </header>

      {/* Main Content Area: 5 Panels using Flexbox */}
      <div className="flex-grow flex overflow-hidden">
        {/* Section 1: Patient Queue Panel (Fixed Width) */}
        <aside className={cn(
            "w-[300px] xl:w-[340px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full overflow-hidden shadow-lg z-10",
            isRTL ? "border-l dark:border-slate-700" : "border-r dark:border-slate-700"
        )}>
          <PatientQueuePanel 
            currentShift={currentClinicShift || null} // Ensure it's never undefined
            onShiftChange={handleShiftNavigationInQueue}
            onPatientSelect={handlePatientSelect}
            selectedVisitId={selectedQueueItem?.visit_id || null}
            globalSearchTerm={debouncedGlobalSearch}
          />
        </aside>

        {/* Section 2: Test Selection Panel (Fixed Width, shows if patient selected) */}
        <section className={cn(
            "w-[260px] xl:w-[300px] flex-shrink-0 bg-slate-50 dark:bg-slate-800 border-border flex-col h-full overflow-hidden shadow-md",
             isRTL ? "border-l dark:border-slate-700" : "border-r dark:border-slate-700",
             showTestSelectionPanel ? "flex" : "hidden md:flex md:items-center md:justify-center" 
        )}>
          {selectedQueueItem ? (
            <TestSelectionPanel 
                key={`test-select-${selectedQueueItem.visit_id}`}
                visitId={selectedQueueItem.visit_id} 
                patientName={selectedQueueItem.patient_name}
                onTestSelect={handleTestSelectForEntry}
                selectedLabRequestId={selectedLabRequestForEntry?.id || null}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground hidden md:flex flex-col items-center justify-center h-full">
                <Users size={32} className="mb-2 opacity-30"/>
                <span>{t('labResults:selectPatientPrompt')}</span>
            </div>
          )}
        </section>
        
        {/* Section 3: Result Entry Panel (Takes remaining space) */}
        <main className="flex-grow bg-slate-100 dark:bg-slate-900/70 flex flex-col h-full overflow-hidden relative">
          {selectedLabRequestForEntry ? (
            <ResultEntryPanel 
                key={`result-entry-${selectedLabRequestForEntry.id}`}
                initialLabRequest={selectedLabRequestForEntry}
                onResultsSaved={handleResultsSaved}
                onClosePanel={() => setSelectedLabRequestForEntry(null)} 
            />
          ) : (
            <div className="flex-grow flex items-center justify-center p-10 text-center">
                <div className="flex flex-col items-center text-muted-foreground">
                    <Microscope size={48} className="mb-4 opacity-50"/>
                    <p>{selectedQueueItem ? t('labResults:selectTestPrompt') : t('labResults:selectPatientAndTestPrompt')}</p>
                </div>
            </div>
          )}
        </main>

        {/* Section 4: Status & Info Panel (Fixed Width, shows if patient selected) */}
         <aside className={cn(
            "w-[260px] xl:w-[300px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex-col h-full overflow-hidden shadow-md",
             isRTL ? "border-r dark:border-slate-700" : "border-l dark:border-slate-700",
             showStatusAndInfoPanel ? "flex" : "hidden lg:flex lg:items-center lg:justify-center"
        )}>
            {selectedQueueItem ? (
                <StatusAndInfoPanel 
                    key={`info-panel-${selectedQueueItem.visit_id}-${selectedLabRequestForEntry?.id || 'none'}`}
                    patientId={selectedQueueItem.patient_id} 
                    visitId={selectedQueueItem.visit_id}
                    selectedLabRequest={selectedLabRequestForEntry}
                />
            ) : (
                 <div className="p-4 text-center text-muted-foreground hidden lg:flex flex-col items-center justify-center h-full">
                    <Info size={32} className="mb-2 opacity-30"/>
                    <span>{t('labResults:noInfoToShow')}</span>
                 </div>
            )}
        </aside>

        {/* Section 5: Lab Actions Pane (Fixed Width) */}
        <aside className={cn(
            "w-[56px] flex-shrink-0 bg-card dark:bg-slate-800/50 flex flex-col h-full items-center p-1.5 space-y-1.5 shadow-md",
            isRTL ? "border-r dark:border-slate-700" : "border-l dark:border-slate-700"
        )}>
          <LabActionsPane 
            selectedLabRequest={selectedLabRequestForEntry}
            selectedVisitId={selectedQueueItem?.visit_id || null}
          />
        </aside>
      </div>
      <Toaster richColors position={isRTL ? "top-left" : "top-right"} />
    </div>
  );
};
export default LabWorkstationPage;