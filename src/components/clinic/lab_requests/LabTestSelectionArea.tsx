// src/components/clinic/lab_requests/LabTestSelectionArea.tsx
import React from 'react'; // Removed useState, useCallback as they are managed by parent
import { useTranslation } from 'react-i18next';
// import { Button } from '@/components/ui/button'; // Button removed from here
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Microscope } from 'lucide-react';

import type { MainTestStripped } from '@/types/labTests';
import LabTestSelectionTabs from '../LabTestSelectionTabs';

interface LabTestSelectionAreaProps {
  visitId: number;
  // existingRequestCount: number; // Button moved to parent
  // addTestsMutation: AddTestsMutationType; // Button moved to parent
  onSwitchToDisplayMode: () => void; // Callback to hide this selection area

  // New props to manage selection and comment from parent
  selectedTestIds: Set<number>;
  onTestSelectionChange: (testId: number, isSelected: boolean) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onAddById: (test: MainTestStripped) => void; // Keep this for "Add by ID" functionality within tabs
}

const LabTestSelectionArea: React.FC<LabTestSelectionAreaProps> = ({
  visitId,
  // existingRequestCount,
  // addTestsMutation,
  onSwitchToDisplayMode,
  selectedTestIds,
  onTestSelectionChange,
  comment,
  onCommentChange,
  onAddById,
}) => {
  const { t } = useTranslation(['labTests', 'common']);

  return (
    <Card className="shadow-md h-full flex flex-col"> {/* Ensure card can flex vertically */}
      <CardHeader className="pb-3 flex-shrink-0">
        {/* Button has been moved to parent (LabRequestComponent) */}
        <CardTitle className="text-md flex items-center gap-2">
          <Microscope className="h-5 w-5 text-primary" />
          {t('labTests:request.selectTestsTitle')}
        </CardTitle>
        <CardDescription>{t('labTests:request.selectAndAddDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow flex flex-col overflow-hidden"> {/* Allow content to grow and overflow */}
        <div className="flex-grow overflow-hidden"> {/* This div will contain the scrollable tabs */}
          <LabTestSelectionTabs
            visitId={visitId}
            selectedTestIds={selectedTestIds}
            onTestSelectionChange={onTestSelectionChange}
            onAddById={onAddById}
          />
        </div>
        <div className="space-y-1 pt-2 flex-shrink-0"> {/* Comment section */}
          <Label htmlFor="labrequest-batch-comment" className="text-xs font-medium">
            {t('labTests:request.commentLabel')}
          </Label>
          <Textarea
            id="labrequest-batch-comment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={t('labTests:request.commentPlaceholderOverall')}
            rows={2}
            // disabled={addTestsMutation.isPending} // Disable if parent is submitting
            className="text-sm"
          />
        </div>
      </CardContent>
      {/* CardFooter with "Request Selected" button is removed and moved to LabRequestComponent */}
    </Card>
  );
};
export default LabTestSelectionArea;