// src/components/lab/workstation/TestSelectionPanel.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Box, Card as MuiCard, Typography, Checkbox as MuiCheckbox, IconButton as MuiIconButton, Button } from '@mui/material';
import { MessageSquare } from 'lucide-react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { cn } from '@/lib/utils';

import type { LabRequest } from '@/types/visits';
import { getLabRequestsForVisit, updateLabRequestFlags } from '@/services/labRequestService';

interface TestSelectionPanelProps {
  visitId: number;
  onTestSelect: (labRequest: LabRequest) => void; // Callback when a test is chosen for result entry
  selectedLabRequestId: number | null; // To highlight the active test
  onOpenComment?: (labRequestId: number) => void; // Optional: open comment dialog in parent
}

const TestSelectionPanel: React.FC<TestSelectionPanelProps> = ({ 
    visitId, onTestSelect, selectedLabRequestId, onOpenComment 
 }) => {
  const queryClient = useQueryClient();

  const labRequestsQueryKey = ['labRequestsForVisit', visitId] as const;

  const { 
     data: labRequests, 
     isLoading, 
     error
 } = useQuery<LabRequest[], Error>({
    queryKey: labRequestsQueryKey,
    queryFn: () => getLabRequestsForVisit(visitId),
    enabled: !!visitId,
  });

  const updateHiddenFlagMutation = useMutation({
     mutationFn: (params: { labRequestId: number; hidden: boolean }) => 
         updateLabRequestFlags(params.labRequestId, { hidden: params.hidden }),
     onSuccess: (updatedLabRequest, variables) => {
        toast.success('تم تحديث حالة الترحيل');
         // Optimistically update the cache or invalidate
         queryClient.setQueryData(labRequestsQueryKey, (oldData: LabRequest[] | undefined) => 
             oldData?.map(lr => lr.id === variables.labRequestId ? {...lr, ...updatedLabRequest} : lr) || []
         );
     },
     onError: (error: Error) => {
        const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'فشل التحديث';
        toast.error(errorMessage);
     }
  });

  const handleTrailerChange = (labRequestId: number, currentHiddenStatus: boolean) => {
     updateHiddenFlagMutation.mutate({ labRequestId, hidden: !currentHiddenStatus });
  };

  const handleSelectTestForEntry = (labRequest: LabRequest) => {
     onTestSelect(labRequest);
  };
  
  const ArrowIcon = (typeof document !== 'undefined' && document?.dir === 'ltr') ? ChevronRightIcon : ChevronLeftIcon;
  return (
    <Box  className="h-full flex flex-col p-3 bg-background dark:bg-card/50">
 

 
      
      {!isLoading && !error && labRequests && labRequests.length > 0 && (
         <Box sx={{direction:'rtl'}} className="flex-grow  -mx-1 overflow-y-auto">
            <Box  className={`space-y-1.5 px-1`}>
            {labRequests.map(lr => (
                <MuiCard 
                    key={lr.id} 
                    className={cn(
                        "p-2 cursor-pointer  hover:bg-muted dark:hover:bg-muted/40 transition-colors",
                        selectedLabRequestId === lr.id && "ring-2 ring-primary bg-primary/20 dark:bg-primary/30 border-primary/50",
                        lr.hidden == false && "",
                        selectedLabRequestId === lr.id && "bg-amber-200!"
                    )}
                    onClick={() => handleSelectTestForEntry(lr)}
                >
                    <Box className="flex items-center justify-between gap-2">
                        <Box className="flex-grow min-w-0">
                            <Typography variant="body2" className={cn("text-sm font-medium truncate", lr.hidden ===  false && "line-through")} title={lr.main_test?.main_test_name}>
                                {lr.main_test?.main_test_name || 'تحليل غير معروف'}
                            </Typography>
                           
                        </Box>
                        <Box className="flex items-center flex-shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                            <MuiCheckbox 
                                id={`trailer-${lr.id}`} 
                                checked={lr.hidden == false}
                                onChange={() => handleTrailerChange(lr.id, lr.hidden)}
                                disabled={updateHiddenFlagMutation.isPending && updateHiddenFlagMutation.variables?.labRequestId === lr.id}
                                inputProps={{ 'aria-label': 'تحديد ' }}
                                size="small"
                            />
                            <MuiIconButton
                              size="small"
                              onClick={() => onOpenComment?.(lr.id)}
                              title={lr.comment ? 'عرض/تعديل الملاحظة' : 'إضافة ملاحظة'}
                              disabled={!onOpenComment}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </MuiIconButton>
                        </Box>
                        <ArrowIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 opacity-70"/>
                    </Box>
                </MuiCard>
            ))}
            </Box>
         </Box>
      )}


      {/* Comment Button - Shows when a test is selected */}
      {selectedLabRequestId && onOpenComment && (
        <Box className="mt-3 pt-3 border-t border-border">
          <Button
            variant="outlined"
            size="small"
            startIcon={<MessageSquare className="h-4 w-4" />}
            onClick={() => onOpenComment(selectedLabRequestId)}
            className="w-full"
            sx={{ 
              justifyContent: 'flex-start',
              textAlign: 'right',
              direction: 'rtl'
            }}
          >
            {labRequests?.find(lr => lr.id === selectedLabRequestId)?.comment 
              ? 'عرض/تعديل الملاحظة' 
              : 'إضافة ملاحظة'
            }
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TestSelectionPanel;