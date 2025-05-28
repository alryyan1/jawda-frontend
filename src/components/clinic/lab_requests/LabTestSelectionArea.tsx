// src/components/clinic/lab_requests/LabTestSelectionArea.tsx
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2, Microscope, ListChecks } from 'lucide-react';

import type { MainTestStripped } from '@/types/labTests';
import type { LabRequest } from '@/types/visits';
import LabTestSelectionTabs from '../LabTestSelectionTabs';

// Props for the addTestsMutation passed from parent
type AddTestsMutationType = UseMutationResult<LabRequest[], Error, { main_test_ids: number[]; comment?: string | undefined; }, unknown>;

interface LabTestSelectionAreaProps {
  visitId: number;
  existingRequestCount: number; // To show on "View Requested" button
  addTestsMutation: AddTestsMutationType; // Pass the mutation itself
  onSwitchToDisplayMode: () => void; // Callback to hide this selection area
}

const LabTestSelectionArea: React.FC<LabTestSelectionAreaProps> = ({
  visitId,
  existingRequestCount,
  addTestsMutation,
  onSwitchToDisplayMode,
}) => {
  const { t } = useTranslation(['labTests', 'common']);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
  const [comment, setComment] = useState('');

  const handleTestSelectionChange = useCallback((testId: number, isSelected: boolean) => {
    setSelectedTestIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) newSet.add(testId);
      else newSet.delete(testId);
      return newSet;
    });
  }, []);

  const handleAddById = useCallback((test: MainTestStripped) => {
    if (!selectedTestIds.has(test.id)) {
        setSelectedTestIds(prev => new Set(prev).add(test.id));
        toast.success(t('labTests:request.testAddedToSelection', {testName: test.main_test_name}));
    } else {
        toast.info(t('labTests:request.testAlreadySelected', {testName: test.main_test_name}));
    }
  }, [selectedTestIds, t]);

  const handleRequestSelected = () => {
    if (selectedTestIds.size > 0) {
      addTestsMutation.mutate({ 
        main_test_ids: Array.from(selectedTestIds),
        comment: comment.trim() || undefined
      }, {
        onSuccess: () => { // Clear local state on parent mutation success
            setSelectedTestIds(new Set());
            setComment('');
            // Parent's onSuccess in mutation already handles toast & invalidation & switching UI mode
        }
      });
    } else {
        toast.info(t('labTests:request.noTestsSelectedForRequest'));
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
            <CardTitle className="text-md flex items-center gap-2">
                <Microscope className="h-5 w-5 text-primary"/>{t('labTests:request.selectTestsTitle')}
            </CardTitle>
            {existingRequestCount > 0 && (
                 <Button variant="ghost" size="sm" onClick={onSwitchToDisplayMode}>
                    {t('common:viewRequested')} ({existingRequestCount})
                    <ListChecks className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
                 </Button>
            )}
        </div>
        <CardDescription>{t('labTests:request.selectAndAddDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <LabTestSelectionTabs 
          visitId={visitId}
          selectedTestIds={selectedTestIds} // Pass the local set
          onTestSelectionChange={handleTestSelectionChange}
          onAddById={handleAddById}
        />
        <div className="space-y-1 pt-2">
            <Label htmlFor="labrequest-batch-comment" className="text-xs font-medium">{t('labTests:request.commentLabel')}</Label>
            <Textarea 
                id="labrequest-batch-comment" 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('labTests:request.commentPlaceholderOverall')} 
                rows={2} 
                disabled={addTestsMutation.isPending}
                className="text-sm"
            />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t pt-3">
        <Button 
            onClick={handleRequestSelected} 
            disabled={selectedTestIds.size === 0 || addTestsMutation.isPending}
            size="sm"
        >
            {addTestsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/>}
            {t('labTests:request.requestSelectedButton', { count: selectedTestIds.size })}
        </Button>
      </CardFooter>
    </Card>
  );
};
export default LabTestSelectionArea;