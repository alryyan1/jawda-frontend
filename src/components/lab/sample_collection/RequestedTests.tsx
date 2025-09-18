// src/components/lab/sample_collection/RequestedTests.tsx
import React, { useState } from 'react';
import { Box, Stack, Typography, Divider, IconButton, Button, Chip, List, ListItem, ListItemText } from '@mui/material';
import { Printer, FlaskConical } from 'lucide-react';
import { markPatientSampleCollectedForVisitApi } from '@/services/sampleCollectionService';
import type { LabRequest } from '@/types/visits';
import { updateLabRequestFlags } from '@/services/labRequestService';
import { ThumbDown, ThumbUp } from '@mui/icons-material';
import { toast } from 'sonner';
interface RequestedTestsProps {
  selectedVisitId: number | null;
  labRequests: LabRequest[];
  onPrintAllLabels: () => void;
  onAfterPrint?: () => void;
}

// New list item component
const RequestedTestListItem: React.FC<{
  lr: LabRequest;
  index: number;
}> = ({ lr, index }) => {

    const [isThumbUp, setIsThumbUp] = useState(lr.no_sample);
    const handleToggle = async (lr: LabRequest) => {

        setIsThumbUp(!isThumbUp);
        try {
          await updateLabRequestFlags(lr.id, { no_sample: isThumbUp ? 0 : 1 } as unknown as { no_sample: boolean });
          toast.success('تم تحديث حالة العينة بنجاح');
        } catch {
          setIsThumbUp(!isThumbUp);
        }
      };
  return (
    <ListItem
      key={lr.id}
      secondaryAction={
        <IconButton edge="end" size="small" onClick={() => handleToggle(lr)}>
          {isThumbUp ? <ThumbDown fontSize="small" /> : <ThumbUp fontSize="small" />}
        </IconButton>
      }
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1, pr: 1, bgcolor: isThumbUp ? 'rgba(240,128,128,0.22)' : 'transparent' }}
      title={`Sample ID: ${lr.id ?? '-'}`}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        <Chip label={index + 1} size="small" sx={{ minWidth: 28 }} />
        <ListItemText
          primaryTypographyProps={{ variant: 'caption', noWrap: true }}
          primary={(lr.main_test as unknown as { name?: string })?.name ?? '-'}
        />
      </Stack>
    </ListItem>
  );
};

const RequestedTests: React.FC<RequestedTestsProps> = ({ selectedVisitId, labRequests, onPrintAllLabels, onAfterPrint }) => {

 

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
          <FlaskConical size={16} />
          <Typography variant="body2">التحاليل المطلوبة</Typography>
        </Stack>
      </Stack>
      <Divider sx={{ my: 1.5 }} />

      <Box >
        {labRequests.length === 0 ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">لا توجد فحوصات لهذه الزيارة</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {labRequests.map((lr, idx) => (
              <RequestedTestListItem key={lr.id} lr={lr} index={idx} />
            ))}
          </List>
        )}
       
      </Box>
      <Button size="small" variant="outlined" disabled={!selectedVisitId} onClick={async () => {
        if (!selectedVisitId) return;
        await onPrintAllLabels();
        try {
          await markPatientSampleCollectedForVisitApi(selectedVisitId);
          toast.success('تم تحديث حالة جمع العينة للمريض');
        } catch {
          // ignore
        }
        if (onAfterPrint) onAfterPrint();
      }}>
          <Printer size={16} style={{ marginInlineEnd: 6 }} />
          طباعة باركود
        </Button>
    </Box>
  );
};

export default RequestedTests;


