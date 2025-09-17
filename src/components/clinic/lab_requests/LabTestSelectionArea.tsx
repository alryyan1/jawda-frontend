// src/components/clinic/lab_requests/LabTestSelectionArea.tsx
import React from 'react'; // Removed useState, useCallback as they are managed by parent
import { Card, CardHeader, CardContent, Typography, Box, TextField } from '@mui/material';
import MicroscopeIcon from '@mui/icons-material/Biotech';

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
  // onSwitchToDisplayMode, // handled by parent
  selectedTestIds,
  onTestSelectionChange,
  comment,
  onCommentChange,
  onAddById,
}) => {
  return (
    <Card sx={{ boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        sx={{ pb: 1 }}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MicroscopeIcon color="primary" fontSize="small" />
            <Typography variant="h6">اختيار التحاليل</Typography>
          </Box>
        }
        subheader={
          <Typography variant="body2" color="text.secondary">
            قم باختيار التحاليل وإضافتها إلى الطلب
          </Typography>
        }
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <LabTestSelectionTabs
            visitId={visitId}
            selectedTestIds={selectedTestIds}
            onTestSelectionChange={onTestSelectionChange}
            onAddById={onAddById}
          />
        </Box>
        <Box sx={{ pt: 1 }}>
          <Typography component="label" htmlFor="labrequest-batch-comment" sx={{ fontSize: 12, fontWeight: 500, display: 'block', mb: 0.5 }}>
            ملاحظات الطلب
          </Typography>
          <TextField
            id="labrequest-batch-comment"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="أضف ملاحظة عامة للطلب"
            multiline
            minRows={2}
            size="small"
            fullWidth
          />
        </Box>
      </CardContent>
    </Card>
  );
};
export default LabTestSelectionArea;