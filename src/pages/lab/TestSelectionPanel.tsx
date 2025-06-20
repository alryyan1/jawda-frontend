// src/components/lab/workstation/TestSelectionPanel.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button'; // For "View Results" or select button
import { Loader2, AlertTriangle, ListChecks, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

import { LabRequest } from '@/types/labTests'; // Or from types/visits
import { getLabRequestsForVisit, updateLabRequestFlags } from '@/services/labRequestService';

interface TestSelectionPanelProps {
  visitId: number;
  patientName: string;
  onTestSelect: (labRequest: LabRequest) => void; // Callback when a test is chosen for result entry
  selectedLabRequestId: number | null; // To highlight the active test
}

const TestSelectionPanel: React.FC<TestSelectionPanelProps> = ({ 
    visitId, patientName, onTestSelect, selectedLabRequestId 
 }) => {
  const { t, i18n } = useTranslation(['labResults', 'common', 'labTests']);
  const queryClient = useQueryClient();

  const labRequestsQueryKey = ['labRequestsForVisit', visitId] as const;

  const { 
     data: labRequests, 
     isLoading, 
     error, 
     isFetching 
 } = useQuery<LabRequest[], Error>({
    queryKey: labRequestsQueryKey,
    queryFn: () => getLabRequestsForVisit(visitId),
    enabled: !!visitId,
  });

  const updateHiddenFlagMutation = useMutation({
     mutationFn: (params: { labRequestId: number; hidden: boolean }) => 
         updateLabRequestFlags(params.labRequestId, { hidden: params.hidden }),
     onSuccess: (updatedLabRequest, variables) => {
         toast.success(t('labResults:testSelection.trailerStatusUpdated'));
         // Optimistically update the cache or invalidate
         queryClient.setQueryData(labRequestsQueryKey, (oldData: LabRequest[] | undefined) => 
             oldData?.map(lr => lr.id === variables.labRequestId ? {...lr, hidden: variables.hidden, ...updatedLabRequest} : lr) || []
         );
     },
     onError: (error: any) => {
         toast.error(error.response?.data?.message || t('common:error.updateFailed'));
     }
  });

  const handleTrailerChange = (labRequestId: number, currentHiddenStatus: boolean) => {
     updateHiddenFlagMutation.mutate({ labRequestId, hidden: !currentHiddenStatus });
  };

  const handleSelectTestForEntry = (labRequest: LabRequest) => {
     onTestSelect(labRequest);
  };
  
  const ArrowIcon = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;


  return (
    <div className="h-full flex flex-col p-3 bg-background dark:bg-card/50">
      <div className="pb-2 mb-2 border-b sticky top-0 bg-inherit z-10">
         <h3 className="text-base font-semibold truncate" title={patientName}>
             {t('labResults:testSelection.title', { patientName: patientName })}
         </h3>
         <p className="text-xs text-muted-foreground">{t('labResults:testSelection.description')}</p>
      </div>

      {isLoading && (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="p-4 text-center text-destructive">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
          {t('common:error.fetchFailed', {entity: t('labTests:labRequestsEntityNamePlural', "Lab Requests")})}
          <p className="text-xs mt-1">{error.message}</p>
        </div>
      )}

      {!isLoading && !error && (!labRequests || labRequests.length === 0) && (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center p-4">{t('labResults:testSelection.noTestsForVisit')}</p>
        </div>
      )}
      
      {!isLoading && !error && labRequests && labRequests.length > 0 && (
         <ScrollArea className="flex-grow -mx-1">
             <div className="space-y-1.5 px-1">
             {labRequests.map(lr => (
                 <Card 
                     key={lr.id} 
                     className={cn(
                         "p-2 cursor-pointer hover:bg-muted dark:hover:bg-muted/40 transition-colors",
                         selectedLabRequestId === lr.id && "ring-2 ring-primary bg-primary/10 dark:bg-primary/20",
                         lr.hidden == false && "opacity-60 hover:opacity-80"
                     )}
                     onClick={() => handleSelectTestForEntry(lr)}
                 >
                     <div className="flex items-center justify-between gap-2">
                         <div className="flex-grow min-w-0">
                             <p className={cn("text-sm font-medium truncate", lr.hidden ===  false && "line-through")} title={lr.main_test?.main_test_name}>
                                 {lr.main_test?.main_test_name || t('common:unknownTest')}
                             </p>
                             <p className="text-xs text-muted-foreground">
                                 ID: {lr.id} | {t('common:price')}: {Number(lr.price).toFixed(1)} 
                                 {/* Add other info like sample ID if available */}
                             </p>
                         </div>
                         <div className="flex flex-col items-center flex-shrink-0 gap-1">
                             <Checkbox 
                                 id={`trailer-${lr.id}`} 
                                 checked={lr.hidden == false} 
                                 onCheckedChange={() => handleTrailerChange(lr.id, lr.hidden)}
                                 onClick={(e) => e.stopPropagation()} // Prevent card click
                                 disabled={updateHiddenFlagMutation.isPending && updateHiddenFlagMutation.variables?.labRequestId === lr.id}
                                 aria-label={t('labResults:testSelection.markAsTrailer')}
                             />
                             <label htmlFor={`trailer-${lr.id}`} className="text-[10px] text-muted-foreground cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                 {t('labResults:testSelection.trailerShort')}
                             </label>
                         </div>
                         <ArrowIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 opacity-70 group-hover:opacity-100"/>
                     </div>
                 </Card>
             ))}
             </div>
         </ScrollArea>
      )}
    </div>
  );
};

export default TestSelectionPanel;