import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import type {
  AdmissionRequestedServiceFormData,
} from '@/types/admissions';
import {
  addAdmissionServices,
} from '@/services/admissionServiceService';
import { getServices } from '@/services/serviceService';
import type { Service } from '@/types/services';

interface AddAdmissionServiceDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
}

export default function AddAdmissionServiceDialog({
  open,
  onClose,
  admissionId,
}: AddAdmissionServiceDialogProps) {
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const { data: servicesData } = useQuery({
    queryKey: ['servicesList', 'all'],
    queryFn: () => getServices(1, { activate: true, per_page: 10000 }),
  });
  const services = servicesData?.data || [];

  useEffect(() => {
    if (open) {
      setSelectedService(null);
    }
  }, [open]);

  const addMutation = useMutation({
    mutationFn: (data: AdmissionRequestedServiceFormData) =>
      addAdmissionServices(admissionId, data),
    onSuccess: () => {
      toast.success('تم إضافة الخدمة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionServices', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionBalance', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionLedger', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admissionTransactions', admissionId] });
      setSelectedService(null);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الخدمة');
    },
  });

  const handleAdd = () => {
    if (!selectedService) {
      toast.error('يرجى اختيار خدمة');
      return;
    }

    const formData: AdmissionRequestedServiceFormData = {
      service_ids: [selectedService.id],
      doctor_id: null,
    };
    addMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إضافة خدمة</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Autocomplete
            options={services || []}
            getOptionLabel={(option) => option.name}
            value={selectedService}
            onChange={(_, newValue) => {
              setSelectedService(newValue);
            }}
            renderInput={(params) => (
              <TextField {...params} label="اختر الخدمة" placeholder="ابحث عن خدمة..." />
            )}
            disabled={addMutation.isPending}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={addMutation.isPending}>
          إلغاء
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={addMutation.isPending || !selectedService}
        >
          {addMutation.isPending ? (
            <CircularProgress size={20} />
          ) : (
            'إضافة'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

