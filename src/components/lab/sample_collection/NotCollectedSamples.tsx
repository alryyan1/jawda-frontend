// src/components/lab/sample_collection/NotCollectedSamples.tsx
import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Alert, 
  Stack,
  Chip
} from '@mui/material';
import { Users, AlertTriangle, Clock } from 'lucide-react';

import PatientLabRequestItem from '@/components/lab/workstation/PatientLabRequestItem';
import type { PatientLabQueueItem } from '@/types/labWorkflow';
import type { LabAppearanceSettings } from '@/lib/appearance-settings-store';

interface NotCollectedSamplesProps {
  queueItems: PatientLabQueueItem[];
  onPatientSelect: (queueItem: PatientLabQueueItem) => void;
  selectedVisitId: number | null;
  appearanceSettings: LabAppearanceSettings;
  isLoading?: boolean;
  error?: string | null;

  // Context Menu Action Callbacks
  onSendWhatsAppText: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToPatient: (queueItem: PatientLabQueueItem) => void;
  onSendPdfToCustomNumber: (queueItem: PatientLabQueueItem) => void;
  onToggleResultLock: (queueItem: PatientLabQueueItem) => void;
}

const NotCollectedSamples: React.FC<NotCollectedSamplesProps> = ({
  queueItems, onPatientSelect, selectedVisitId, appearanceSettings, isLoading = false, error = null,
  onSendWhatsAppText, onSendPdfToPatient, onSendPdfToCustomNumber, onToggleResultLock
}) => {

  console.log("queueItems", queueItems);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: 200 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'transparent',
          color: 'text.primary'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5}>
          <Clock size={20} color="#6b7280" />
          <Chip label={queueItems.length} size="small" variant="outlined" />
        </Stack>
      </Paper>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        {isLoading && (
          <Box 
            sx={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'background.paper',
              opacity: 0.8,
              zIndex: 10
            }}
          >
            <Typography variant="body2" color="text.secondary">
              جاري التحميل...
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTriangle size={32} style={{ marginBottom: 8 }} />
              <Typography variant="body2">
                فشل في تحميل قائمة العينات غير المجمعة
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                {error}
              </Typography>
            </Alert>
          </Box>
        )}
        
        {!isLoading && queueItems.length === 0 && !error && (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              p: 6, 
              textAlign: 'center' 
            }}
          >
            <Users size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="body1" color="text.secondary">
              لا توجد عينات غير مجمعة
            </Typography>
          </Box>
        )}

        {queueItems.length > 0 && (
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
              {queueItems.map((item) => (
                <PatientLabRequestItem
                  key={`${item.visit_id}-${item.patient_id}`}
                  item={item}
                  isSelected={selectedVisitId === item.visit_id}
                  onSelect={() => onPatientSelect(item)}
                  allRequestsPaid={(item as unknown as Record<string, unknown>).all_requests_paid_for_badge as boolean}
                  isResultLocked={(item as unknown as Record<string, unknown>).is_result_locked as boolean}
                  appearanceSettings={appearanceSettings}
                  onSendWhatsAppText={onSendWhatsAppText}
                  onSendPdfToPatient={onSendPdfToPatient}
                  onSendPdfToCustomNumber={onSendPdfToCustomNumber}
                  onToggleResultLock={onToggleResultLock}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NotCollectedSamples;
