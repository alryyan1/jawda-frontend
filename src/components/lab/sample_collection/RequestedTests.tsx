// src/components/lab/sample_collection/RequestedTests.tsx
import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Divider, IconButton, Button, Chip, List, ListItem, ListItemText } from '@mui/material';
import { Printer, FlaskConical } from 'lucide-react';
import type { LabRequest } from '@/types/visits';
import { updateLabRequestFlags } from '@/services/labRequestService';

interface RequestedTestsProps {
  selectedVisitId: number | null;
  labRequests: LabRequest[];
  onPrintAllLabels: () => void;
}

const RequestedTests: React.FC<RequestedTestsProps> = ({ selectedVisitId, labRequests, onPrintAllLabels }) => {
  const initialStates = useMemo(() => {
    const map: Record<number, boolean> = {};
    labRequests.forEach((lr) => {
      if (lr.id != null) map[lr.id] = true; // default thumbs up
    });
    return map;
  }, [labRequests]);

  const [thumbs, setThumbs] = useState<Record<number, boolean>>(initialStates);

  const ThumbsUpIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden>
      <path d="M104 224H24c-13.255 0-24 10.745-24 24v240c0 13.255 10.745 24 24 24h80c13.255 0 24-10.745 24-24V248c0-13.255-10.745-24-24-24zM497.9 273.5c4.2-12.6 3.7-23.2 2-31.3 5.2-9.8 7.1-21.7 1.1-33.6-7.2-14.5-21.4-22.6-37-22.6H336c9.6-19.3 16-41.5 16-64 0-28.4-11-51.3-28.9-68.3-9.8-9.3-25.6-8.9-35.3.9L160 145.3V456c0 22.1 17.9 40 40 40h194.7c17.4 0 32.8-11.2 38-27.8l65.2-194.5z" />
    </svg>
  );
  const ThumbsDownIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden>
      <path d="M104 32H24C10.7 32 0 42.7 0 56v240c0 13.3 10.7 24 24 24h80c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24zm393.9 206.5c4.2-12.6 3.7-23.2 2-31.3 5.2-9.8 7.1-21.7 1.1-33.6-7.2-14.5-21.4-22.6-37-22.6H336c9.6-19.3 16-41.5 16-64 0-22.1-17.9-40-40-40H117.3C99.9 47 84.5 58.2 79.3 74.8L14.1 269.3c-4.2 12.6-3.7 23.2-2 31.3-5.2 9.8-7.1 21.7-1.1 33.6 7.2 14.5 21.4 22.6 37 22.6H176c-9.6 19.3-16 41.5-16 64 0 22.1 17.9 40 40 40h194.7c17.4 0 32.8-11.2 38-27.8l65.2-194.5z" />
    </svg>
  );

  const handleToggle = async (lr: LabRequest) => {
    const id = lr.id as number;
    const wasUp = thumbs[id];
    const nextUp = !wasUp;
    setThumbs((prev) => ({ ...prev, [id]: nextUp }));
    try {
      // no_sample is true when thumbs is down
      await updateLabRequestFlags(id, { no_sample: !nextUp });
    } catch {
      // Revert on error
      setThumbs((prev) => ({ ...prev, [id]: wasUp }));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
          <FlaskConical size={16} />
          <Typography variant="body2">التحاليل المطلوبة</Typography>
        </Stack>
        <Button size="small" variant="outlined" disabled={!selectedVisitId} onClick={onPrintAllLabels}>
          <Printer size={16} style={{ marginInlineEnd: 6 }} />
          طباعة باركود
        </Button>
      </Stack>
      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {labRequests.length === 0 ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">لا توجد فحوصات لهذه الزيارة</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {labRequests.map((lr, idx) => (
              <ListItem key={lr.id} secondaryAction={
                <IconButton edge="end" size="small" onClick={() => handleToggle(lr)} aria-label={thumbs[lr.id] ? 'thumbs up' : 'thumbs down'}>
                  {thumbs[lr.id] ? <ThumbsUpIcon /> : <ThumbsDownIcon />}
                </IconButton>
              } sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1, pr: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <Chip label={idx + 1} size="small" sx={{ minWidth: 28 }} />
                  <ListItemText
                    primaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    primary={(lr.main_test as unknown as { name?: string })?.name ?? '-'}
                  />
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default RequestedTests;


