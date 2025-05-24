// src/components/lab/workstation/LabActionsPane.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Zap, ListFilter, Settings2, Printer } from 'lucide-react'; // Example icons
import { cn } from '@/lib/utils';

import type { LabRequest } from '@/types/visits'; // Or types/visits
import { toast } from 'sonner';
// import { useAuthorization } from '@/hooks/useAuthorization';

interface LabActionsPaneProps {
  selectedLabRequest: LabRequest | null;
  selectedVisitId: number | null;
  // Add other props if actions depend on more context
}

const LabActionsPane: React.FC<LabActionsPaneProps> = ({
  selectedLabRequest,
  selectedVisitId,
}) => {
  const { t, i18n } = useTranslation(['labResults', 'common']);
  // const { can } = useAuthorization();

  // Placeholder permissions
  const canBatchAuthorize = true; // can('batch_authorize lab_results')
  const canSyncLIS = false; // Example: can('sync_lis') - disabled for now
  const canManageQC = true; // can('manage quality_control')

  const handleBatchAuthorize = () => {
    toast.info(t('common:featureNotImplemented', { feature: t('labResults:labActions.batchAuthorize') }));
    // TODO: Implement batch authorization logic (likely opens a new dialog/page)
  };

  const handleLISSync = () => {
    toast.info(t('common:featureNotImplemented', { feature: t('labResults:labActions.lisSync') }));
    // TODO: Implement LIS sync logic
  };
  
  const handleManageQC = () => {
    toast.info(t('common:featureNotImplemented', { feature: t('labResults:labActions.qualityControl') }));
    // TODO: Navigate to QC page or open QC dialog
  };
  
  const handlePrintWorklist = () => {
    toast.info(t('common:featureNotImplemented', { feature: t('labResults:labActions.printWorklist') }));
    // TODO: Implement Worklist PDF generation
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside 
        className={cn(
            "bg-card border-border p-1.5 flex flex-col items-center space-y-2 overflow-y-auto h-full shadow-md",
            i18n.dir() === 'rtl' ? "border-r" : "border-l" // Should be the outermost border
        )}
        style={{width: '56px'}} // Fixed slim width for icons
      >
        {/* <h3 className="text-[10px] font-medium text-muted-foreground pt-1 self-center uppercase tracking-wider">
          {t('common:actions')}
        </h3> 
        <Separator className="my-1" />
        */}

        {canBatchAuthorize && (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-10 h-10"
                        onClick={handleBatchAuthorize}
                        aria-label={t('labResults:labActions.batchAuthorize')}
                    >
                        <ShieldCheck className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
                    <p>{t('labResults:labActions.batchAuthorize')}</p>
                </TooltipContent>
            </Tooltip>
        )}
        
        {/* Placeholder for LIS Sync */}
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleLISSync} disabled={!canSyncLIS}>
                    <Zap className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
                <p>{t('labResults:labActions.lisSync')}</p>
            </TooltipContent>
        </Tooltip>

        {canManageQC && (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handleManageQC}>
                        <ListFilter className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
                    <p>{t('labResults:labActions.qualityControl')}</p>
                </TooltipContent>
            </Tooltip>
        )}
        
        <Separator className="my-2" />

        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10" onClick={handlePrintWorklist}>
                    <Printer className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
                <p>{t('labResults:labActions.printWorklist')}</p>
            </TooltipContent>
        </Tooltip>

        {/* Spacer to push settings to bottom, or use flex-grow on a container above */}
        <div className="flex-grow"></div> 

        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10" onClick={() => toast.info("Navigate to Lab Settings")}> {/* TODO: Navigate */}
                    <Settings2 className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={i18n.dir() === 'rtl' ? 'left' : 'right'} sideOffset={5}>
                <p>{t('labResults:labActions.labSettings')}</p>
            </TooltipContent>
        </Tooltip>

      </aside>
    </TooltipProvider>
  );
};

export default LabActionsPane;