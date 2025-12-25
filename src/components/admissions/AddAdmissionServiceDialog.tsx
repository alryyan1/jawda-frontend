import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Typography,
} from '@mui/material';
import type {
  AdmissionRequestedService,
  AdmissionRequestedServiceFormData,
  AdmissionRequestedServiceUpdateData,
} from '@/types/admissions';
import {
  addAdmissionServices,
  updateAdmissionService,
} from '@/services/admissionServiceService';
import { getServices } from '@/services/serviceService';
import { getDoctorsList } from '@/services/doctorService';
import type { Service } from '@/types/services';
import type { DoctorStripped } from '@/types/doctors';

interface AddAdmissionServiceDialogProps {
  open: boolean;
  onClose: () => void;
  admissionId: number;
  editService?: AdmissionRequestedService | null;
}

export default function AddAdmissionServiceDialog({
  open,
  onClose,
  admissionId,
  editService,
}: AddAdmissionServiceDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!editService;
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

  const { data: servicesData } = useQuery({
    queryKey: ['servicesList'],
    queryFn: () => getServices(1, { activate: true }),
  });
  const services = servicesData?.data || [];

  const { data: doctors } = useQuery({
    queryKey: ['doctorsList'],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const form = useForm<{
    doctor_id: string;
    discount: string;
    discount_per: string;
    doctor_note: string;
    nurse_note: string;
  }>({
    defaultValues: {
      doctor_id: '',
      discount: '0',
      discount_per: '0',
      doctor_note: '',
      nurse_note: '',
    },
  });

  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (isEditMode && editService) {
      setSelectedServices(editService.service ? [editService.service] : []);
      setQuantities({ [editService.service_id]: editService.count });
      reset({
        doctor_id: editService.doctor_id ? String(editService.doctor_id) : '',
        discount: String(editService.discount),
        discount_per: String(editService.discount_per),
        doctor_note: editService.doctor_note || '',
        nurse_note: editService.nurse_note || '',
      });
    } else {
      setSelectedServices([]);
      setQuantities({});
      reset({
        doctor_id: '',
        discount: '0',
        discount_per: '0',
        doctor_note: '',
        nurse_note: '',
      });
    }
  }, [isEditMode, editService, reset]);

  const addMutation = useMutation({
    mutationFn: (data: AdmissionRequestedServiceFormData) =>
      addAdmissionServices(admissionId, data),
    onSuccess: () => {
      toast.success('تم إضافة الخدمات بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionServices', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل إضافة الخدمات');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: AdmissionRequestedServiceUpdateData) =>
      updateAdmissionService(editService!.id, data),
    onSuccess: () => {
      toast.success('تم تحديث الخدمة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissionServices', admissionId] });
      queryClient.invalidateQueries({ queryKey: ['admission', admissionId] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل تحديث الخدمة');
    },
  });

  const onSubmit = (data: any) => {
    if (isEditMode) {
      if (selectedServices.length === 0) {
        toast.error('يرجى اختيار خدمة');
        return;
      }
      const service = selectedServices[0];
      const updateData: AdmissionRequestedServiceUpdateData = {
        count: quantities[service.id] || 1,
        discount: parseFloat(data.discount) || 0,
        discount_per: parseInt(data.discount_per) || 0,
        doctor_id: data.doctor_id ? parseInt(data.doctor_id) : null,
        doctor_note: data.doctor_note || null,
        nurse_note: data.nurse_note || null,
      };
      updateMutation.mutate(updateData);
    } else {
      if (selectedServices.length === 0) {
        toast.error('يرجى اختيار خدمة واحدة على الأقل');
        return;
      }
      const formData: AdmissionRequestedServiceFormData = {
        service_ids: selectedServices.map((s) => s.id),
        quantities: quantities,
        doctor_id: data.doctor_id ? parseInt(data.doctor_id) : null,
      };
      addMutation.mutate(formData);
    }
  };

  const handleQuantityChange = (serviceId: number, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [serviceId]: quantity }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isEditMode ? 'تعديل الخدمة' : 'إضافة خدمات'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Autocomplete
              multiple={!isEditMode}
              options={services || []}
              getOptionLabel={(option) => option.name}
              value={selectedServices}
              onChange={(_, newValue) => {
                setSelectedServices(Array.isArray(newValue) ? newValue : [newValue]);
                if (Array.isArray(newValue)) {
                  const newQuantities: { [key: number]: number } = {};
                  newValue.forEach((s) => {
                    newQuantities[s.id] = quantities[s.id] || 1;
                  });
                  setQuantities(newQuantities);
                } else if (newValue) {
                  setQuantities({ [newValue.id]: quantities[newValue.id] || 1 });
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="اختر الخدمات" placeholder="ابحث عن خدمة..." />
              )}
              disabled={addMutation.isPending || updateMutation.isPending}
            />

            {selectedServices.map((service) => (
              <Box key={service.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {service.name}
                </Typography>
                <TextField
                  fullWidth
                  label="الكمية"
                  type="number"
                  value={quantities[service.id] || 1}
                  onChange={(e) =>
                    handleQuantityChange(service.id, parseInt(e.target.value) || 1)
                  }
                  inputProps={{ min: 1 }}
                  disabled={addMutation.isPending || updateMutation.isPending}
                />
              </Box>
            ))}

            <Controller
              name="doctor_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth disabled={addMutation.isPending || updateMutation.isPending}>
                  <InputLabel>الطبيب</InputLabel>
                  <Select {...field} label="الطبيب">
                    <MenuItem value="">لا يوجد</MenuItem>
                    {doctors?.map((doctor) => (
                      <MenuItem key={doctor.id} value={String(doctor.id)}>
                        {doctor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller
                name="discount"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="خصم ثابت"
                    type="number"
                    {...field}
                    disabled={addMutation.isPending || updateMutation.isPending}
                  />
                )}
              />
              <Controller
                name="discount_per"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label="خصم نسبة مئوية"
                    type="number"
                    {...field}
                    inputProps={{ min: 0, max: 100 }}
                    disabled={addMutation.isPending || updateMutation.isPending}
                  />
                )}
              />
            </Box>

            <Controller
              name="doctor_note"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="ملاحظة الطبيب"
                  multiline
                  rows={2}
                  {...field}
                  disabled={addMutation.isPending || updateMutation.isPending}
                />
              )}
            />

            <Controller
              name="nurse_note"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="ملاحظة الممرضة"
                  multiline
                  rows={2}
                  {...field}
                  disabled={addMutation.isPending || updateMutation.isPending}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={addMutation.isPending || updateMutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={addMutation.isPending || updateMutation.isPending}
          >
            {addMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={20} />
            ) : isEditMode ? (
              'تحديث'
            ) : (
              'إضافة'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

