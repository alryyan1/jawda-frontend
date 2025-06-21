// src/components/lab/sample_collection/SamplesForVisitPanel.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FlaskConical, ScanLine, CheckCircle2, Printer as PrinterIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipProvider } from "@radix-ui/react-tooltip";

import type { LabRequest } from '@/types/visits';
import { markSampleCollectedApi, generateSampleIdForRequestApi } from '@/services/sampleCollectionService';
import apiClient from '@/services/api';

interface SamplesForVisitPanelProps {
  visitId: number;
  patientName: string;
  labRequests: LabRequest[];
  isLoading: boolean;
  onSampleCollectedSuccess: (updatedLabRequest: LabRequest) => void;
  onGenerateSampleIdSuccess: (updatedLabRequest: LabRequest) => void;
  onPrintSingleLabelTrigger?: (labRequest: LabRequest) => void; 
}

const SamplesForVisitPanel: React.FC<SamplesForVisitPanelProps> = ({
  visitId,
  patientName,
  labRequests,
  isLoading,
  onSampleCollectedSuccess,
  onGenerateSampleIdSuccess,
  onPrintSingleLabelTrigger
}) => {
  const { t } = useTranslation(['labSampleCollection', 'labTests', 'common']);

  const markCollectedMutation = useMutation({
    mutationFn: (labRequestId: number) => markSampleCollectedApi(labRequestId),
    onSuccess: (updatedLabRequest) => {
      onSampleCollectedSuccess(updatedLabRequest);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : t('common:error.operationFailed');
      toast.error(errorMessage);
    }
  });

  const generateIdMutation = useMutation({
    mutationFn: (labRequestId: number) => generateSampleIdForRequestApi(labRequestId),
    onSuccess: (updatedLabRequest) => {
      onGenerateSampleIdSuccess(updatedLabRequest);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : t('common:error.operationFailed');
      toast.error(errorMessage);
    }
  });

  const handleMarkCollectedToggle = (labRequestId: number, currentCollectedAt: string | null | undefined) => {
    if (currentCollectedAt) {
      toast.info(t('labSampleCollection:alreadyMarkedCollectedCannotUnmark'));
      return;
    }
    markCollectedMutation.mutate(labRequestId);
  };

  const handleGenerateId = (labRequestId: number) => {
    generateIdMutation.mutate(labRequestId);
  };

  const handlePrintSingleLabel = async (labRequest: LabRequest) => {
    if (!labRequest.sample_id) {
        toast.error(t('labSampleCollection:generateIdBeforePrint'));
        return;
    }
    if (onPrintSingleLabelTrigger) {
        onPrintSingleLabelTrigger(labRequest);
    } else {
        try {
            toast.info(t('common:generatingPdf'));
            const response = await apiClient.get(`/visits/${visitId}/lab-sample-labels/pdf?lab_request_id=${labRequest.id}`, { responseType: 'blob' });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            const pdfWindow = window.open(fileURL, '_blank');
            pdfWindow?.addEventListener('load', () => URL.revokeObjectURL(fileURL));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('common:error.generatePdfFailed');
            toast.error(errorMessage);
        }
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader><CardTitle>{t('common:loadingData')}</CardTitle></CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  const pendingSamples = labRequests
  console.log(pendingSamples, "pendingSamples",labRequests)
  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader className="pb-2 pt-3 sticky top-0 bg-card z-10 border-b">
          <CardTitle className="text-md flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            {t('labSampleCollection:samplesForVisitTitle', { patientName: patientName || "..." })}
          </CardTitle>
          <CardDescription>
            {t('labSampleCollection:samplesForVisitDescription', { count: pendingSamples.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-hidden">
          {pendingSamples.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {labRequests.length > 0 ? t('labSampleCollection:allSamplesCollectedForVisit') : t('labSampleCollection:noSamplesRequiredForVisit')}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <Table className="text-xs">
                <TableHeader className="sticky top-0 bg-card z-5">
                  <TableRow>
                    <TableHead className="w-[60px] text-center">{t('labSampleCollection:table.collectedFull')}</TableHead>
                    <TableHead>{t('labTests:table.testName')}</TableHead>
                    <TableHead className="hidden md:table-cell w-[130px] text-center">{t('labTests:table.container')}</TableHead>
                    <TableHead className="w-[160px] text-center">{t('labSampleCollection:table.sampleId')}</TableHead>
                    <TableHead className="text-right w-[70px] pr-3">{/* Actions */}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSamples.map((lr: LabRequest) => {
                    const isCollected = !!lr.sample_collected_at;
                    const isCollectingThis = markCollectedMutation.isPending && markCollectedMutation.variables === lr.id;
                    const isGeneratingIdForThis = generateIdMutation.isPending && generateIdMutation.variables === lr.id;
                    
                    return (
                    <TableRow key={lr.id}>
                      <TableCell className="text-center py-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Checkbox
                              checked={isCollected}
                              onCheckedChange={() => handleMarkCollectedToggle(lr.id, lr.sample_collected_at)}
                              disabled={isCollectingThis || isGeneratingIdForThis}
                              aria-label={t('labSampleCollection:markAsCollected')}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('labSampleCollection:markAsCollected')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="py-1.5 font-medium">
                        {lr.main_test?.main_test_name || t('common:unknownTest')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center py-1.5">
                        {lr.main_test?.container?.container_name || lr.main_test?.container_name || '-'}
                      </TableCell>
                      <TableCell className="text-center py-1.5">
                        {lr.sample_id ? (
                          <span className="font-mono text-blue-600 dark:text-blue-400 text-xs">{lr.sample_id}</span>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => handleGenerateId(lr.id)}
                            disabled={isGeneratingIdForThis || isCollectingThis}
                          >
                            {isGeneratingIdForThis
                              ? <Loader2 className="h-3 w-3 animate-spin"/>
                              : <ScanLine className="h-3 w-3 ltr:mr-1 rtl:ml-1"/>}
                            {t('labSampleCollection:generateId')}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-1.5 pr-3">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => handlePrintSingleLabel(lr)}
                                    disabled={!lr.sample_id || isCollectingThis || isGeneratingIdForThis}
                                >
                                    <PrinterIcon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{lr.sample_id ? t('labSampleCollection:printThisLabel') : t('labSampleCollection:generateIdToPrintLabel')}</p>
                            </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SamplesForVisitPanel;