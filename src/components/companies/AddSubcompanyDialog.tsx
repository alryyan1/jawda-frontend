// src/components/companies/AddSubcompanyDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import { toast } from 'sonner';
import apiClient from '@/services/api';

export interface AddSubcompanyDialogProps {
  open: boolean;
  companyId?: number;
  onClose: () => void;
  onCreated?: () => void;
}

const AddSubcompanyDialog: React.FC<AddSubcompanyDialogProps> = ({ open, companyId, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [labEndurance, setLabEndurance] = useState<string>('0');
  const [serviceEndurance, setServiceEndurance] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setLabEndurance('0');
    setServiceEndurance('0');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      reset();
    }
  };

  const handleSubmit = async () => {
    if (!companyId) {
      toast.error('يرجى اختيار الشركة أولاً');
      return;
    }
    if (!name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/subcompanies', {
        name,
        lab_endurance: parseFloat(labEndurance || '0') || 0,
        service_endurance: parseFloat(serviceEndurance || '0') || 0,
        company_id: companyId,
      });
      toast.success('تمت إضافة الشركة الفرعية بنجاح');
      onCreated?.();
      onClose();
      reset();
    } catch (error: any) {
      toast.error('فشل إضافة الشركة الفرعية', { description: error?.response?.data?.message || error?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>إضافة شركة فرعية</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="اسم الشركة الفرعية"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="تحمل المختبر"
            type="number"
            value={labEndurance}
            onChange={(e) => setLabEndurance(e.target.value)}
            fullWidth
            inputProps={{ step: '0.01' }}
          />
          <TextField
            label="تحمل الخدمات"
            type="number"
            value={serviceEndurance}
            onChange={(e) => setServiceEndurance(e.target.value)}
            fullWidth
            inputProps={{ step: '0.01' }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>إلغاء</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>إضافة</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSubcompanyDialog;


