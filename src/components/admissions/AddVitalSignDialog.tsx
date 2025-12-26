import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addVitalSign, updateVitalSign } from '@/services/admissionVitalSignService';
import type { AdmissionVitalSign, AdmissionVitalSignFormData } from '@/types/admissions';

interface AddVitalSignDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
  editVitalSign?: AdmissionVitalSign | null;
}

export default function AddVitalSignDialog({
  open,
  onClose,
  admissionId,
  editVitalSign,
}: AddVitalSignDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!editVitalSign;

  const [formData, setFormData] = useState<AdmissionVitalSignFormData>({
    reading_date: editVitalSign?.reading_date || new Date().toISOString().split('T')[0],
    reading_time: editVitalSign?.reading_time || new Date().toTimeString().slice(0, 8),
    temperature: editVitalSign?.temperature || null,
    blood_pressure_systolic: editVitalSign?.blood_pressure_systolic || null,
    blood_pressure_diastolic: editVitalSign?.blood_pressure_diastolic || null,
    oxygen_saturation: editVitalSign?.oxygen_saturation || null,
    oxygen_flow: editVitalSign?.oxygen_flow || null,
    pulse_rate: editVitalSign?.pulse_rate || null,
    notes: editVitalSign?.notes || null,
  });

  const mutation = useMutation({
    mutationFn: (data: AdmissionVitalSignFormData) =>
      isEditMode && editVitalSign
        ? updateVitalSign(editVitalSign.id, data)
        : addVitalSign(admissionId, data),
    onSuccess: () => {
      toast.success(isEditMode ? 'تم تحديث العلامات الحيوية' : 'تم إضافة العلامات الحيوية');
      queryClient.invalidateQueries({ queryKey: ['admissionVitalSigns', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      onClose();
      if (!isEditMode) {
        setFormData({
          reading_date: new Date().toISOString().split('T')[0],
          reading_time: new Date().toTimeString().slice(0, 8),
          temperature: null,
          blood_pressure_systolic: null,
          blood_pressure_diastolic: null,
          oxygen_saturation: null,
          oxygen_flow: null,
          pulse_rate: null,
          notes: null,
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حفظ العلامات الحيوية');
    },
  });

  const handleChange = (field: keyof AdmissionVitalSignFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value === '' ? null : value }));
  };

  const handleSubmit = () => {
    // Validate that at least one vital sign is provided
    const hasVitalSign =
      formData.temperature !== null ||
      formData.blood_pressure_systolic !== null ||
      formData.blood_pressure_diastolic !== null ||
      formData.oxygen_saturation !== null ||
      formData.oxygen_flow !== null ||
      formData.pulse_rate !== null;

    if (!hasVitalSign) {
      toast.error('يرجى إدخال علامة حيوية واحدة على الأقل');
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditMode ? 'تعديل العلامات الحيوية' : 'إضافة علامات حيوية'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Date and Time Section */}
          <Box>
            <Box sx={{ mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                التاريخ والوقت
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Reading Date"
                type="date"
                value={formData.reading_date}
                onChange={(e) => handleChange('reading_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={mutation.isPending}
              />
              <TextField
                fullWidth
                label="Reading Time"
                type="time"
                value={formData.reading_time}
                onChange={(e) => handleChange('reading_time', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={mutation.isPending}
              />
            </Box>
          </Box>

          {/* Vital Signs Section */}
          <Box>
            <Box sx={{ mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                العلامات الحيوية
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Temperature (°C)"
                type="number"
                value={formData.temperature ?? ''}
                onChange={(e) => handleChange('temperature', e.target.value ? parseFloat(e.target.value) : null)}
                inputProps={{ min: 0, max: 50, step: 0.1 }}
                disabled={mutation.isPending}
              />
              <TextField
                fullWidth
                label="Blood Pressure (Systolic)"
                type="number"
                value={formData.blood_pressure_systolic ?? ''}
                onChange={(e) => handleChange('blood_pressure_systolic', e.target.value ? parseInt(e.target.value) : null)}
                inputProps={{ min: 0, max: 300 }}
                disabled={mutation.isPending}
              />
              <TextField
                fullWidth
                label="Blood Pressure (Diastolic)"
                type="number"
                value={formData.blood_pressure_diastolic ?? ''}
                onChange={(e) => handleChange('blood_pressure_diastolic', e.target.value ? parseInt(e.target.value) : null)}
                inputProps={{ min: 0, max: 300 }}
                disabled={mutation.isPending}
              />
              <TextField
                fullWidth
                label="Oxygen Saturation (SpO2 %)"
                type="number"
                value={formData.oxygen_saturation ?? ''}
                onChange={(e) => handleChange('oxygen_saturation', e.target.value ? parseFloat(e.target.value) : null)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                disabled={mutation.isPending}
              />
              <TextField
                fullWidth
                label="Oxygen Flow (O2 L/min)"
                type="number"
                value={formData.oxygen_flow ?? ''}
                onChange={(e) => handleChange('oxygen_flow', e.target.value ? parseFloat(e.target.value) : null)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                disabled={mutation.isPending}
              />
              <TextField
                fullWidth
                label="Pulse Rate (bpm)"
                type="number"
                value={formData.pulse_rate ?? ''}
                onChange={(e) => handleChange('pulse_rate', e.target.value ? parseInt(e.target.value) : null)}
                inputProps={{ min: 0, max: 300 }}
                disabled={mutation.isPending}
              />
            </Box>
          </Box>

          {/* Notes Section */}
          <Box>
            <Box sx={{ mb: 2, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                ملاحظات إضافية
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={formData.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value || null)}
              disabled={mutation.isPending}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <CircularProgress size={20} />
          ) : (
            isEditMode ? 'تحديث' : 'إضافة'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

