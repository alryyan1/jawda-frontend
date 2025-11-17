// src/components/companies/dialogs/ImportPricePreferenceDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
} from '@mui/material';

export type PriceImportPreference = 'standard_price' | 'zero_price';

interface ImportPricePreferenceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (preference: PriceImportPreference) => void;
  companyName: string;
}

const ImportPricePreferenceDialog: React.FC<ImportPricePreferenceDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  companyName,
}) => {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleConfirm = (preference: PriceImportPreference) => {
    onConfirm(preference);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        تفضيل السعر للاستيراد
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          كيف تريد تعيين أسعار الخدمات عند استيرادها إلى {companyName}؟
        </Typography>
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, width: '100%', justifyContent: 'space-between' }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            fullWidth={false}
            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
          >
            إلغاء
          </Button>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Button
              onClick={() => handleConfirm('zero_price')}
              variant="outlined"
              fullWidth={false}
              sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
            >
              تعيين السعر بصفر
            </Button>
            <Button
              onClick={() => handleConfirm('standard_price')}
              variant="contained"
              fullWidth={false}
              sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
            >
              استخدام السعر القياسي
            </Button>
          </Stack>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ImportPricePreferenceDialog;