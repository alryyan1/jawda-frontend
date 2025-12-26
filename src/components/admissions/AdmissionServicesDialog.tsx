import { Dialog, DialogContent, DialogTitle, DialogActions, Button, Typography, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import AdmissionServicesRequestComponent from './AdmissionServicesRequestComponent';

interface AdmissionServicesDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
}

export default function AdmissionServicesDialog({
  open,
  onClose,
  admissionId,
}: AdmissionServicesDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">إدارة الخدمات</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        <AdmissionServicesRequestComponent
          admissionId={admissionId}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

