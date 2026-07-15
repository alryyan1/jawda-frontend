// src/pages/parties/AddPartyServiceCostDialog.tsx
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Autocomplete,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Add as PlusCircle, Close as CloseIcon } from '@mui/icons-material';

import type { PartyServiceCostFormData } from '@/types/parties';
import type { Service } from '@/types/services';
import { getPartyAvailableServices, addServiceToPartyCosts } from '@/services/partyService';

interface AddPartyServiceCostDialogProps {
  partyId: number;
  partyName: string;
  onCostAdded: () => void;
  triggerButton?: React.ReactNode;
}

interface CostFormValues {
  service_id: string;
  price: string;
}

const AddPartyServiceCostDialog: React.FC<AddPartyServiceCostDialogProps> = ({ partyId, partyName, onCostAdded, triggerButton }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<CostFormValues>({
    defaultValues: { service_id: '', price: '0' },
    mode: 'onChange',
  });

  const { data: availableServices, isLoading: isLoadingServices } = useQuery<Service[], Error>({
    queryKey: ['partyAvailableServices', partyId],
    queryFn: () => getPartyAvailableServices(partyId),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (data: PartyServiceCostFormData) => addServiceToPartyCosts(partyId, data),
    onSuccess: () => {
      toast.success("تم إضافة سعر الخدمة بنجاح!");
      queryClient.invalidateQueries({ queryKey: ['partyServiceCosts', partyId] });
      queryClient.invalidateQueries({ queryKey: ['partyAvailableServices', partyId] });
      onCostAdded();
      form.reset();
      setIsOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "فشل في حفظ السعر";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: CostFormValues) => {
    mutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form, partyId]);

  const selectedServiceId = form.watch('service_id');
  const selectedService = availableServices?.find(service => service.id.toString() === selectedServiceId);

  return (
    <>
      {triggerButton || (
        <Button variant="contained" size="small" startIcon={<PlusCircle />} onClick={() => setIsOpen(true)}>
          إضافة سعر خدمة
        </Button>
      )}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ py: 1.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight="bold">إضافة سعر خدمة جديد</Typography>
            <IconButton onClick={() => setIsOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            إضافة سعر خدمة جديد للجهة {partyName}
          </Typography>
          <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <Controller
              name="service_id"
              control={form.control}
              rules={{ required: "يرجى اختيار خدمة" }}
              render={({ field }) => (
                <Autocomplete
                  fullWidth
                  options={availableServices ?? []}
                  loading={isLoadingServices}
                  value={selectedService || null}
                  getOptionLabel={(option) => option.name + (option.service_group?.name ? ` (${option.service_group.name})` : '')}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, data) => {
                    field.onChange(data ? data.id.toString() : '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="اسم الخدمة"
                      variant="outlined"
                      size="small"
                      error={!!form.formState.errors.service_id}
                      helperText={form.formState.errors.service_id?.message}
                      disabled={mutation.isPending}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingServices ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      sx={{ mb: 1.5 }}
                    />
                  )}
                />
              )}
            />
            <Controller
              name="price"
              control={form.control}
              rules={{
                required: "يرجى إدخال السعر",
                pattern: {
                  value: /^\d+(\.\d+)?$/,
                  message: "يرجى إدخال رقم صحيح",
                },
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="السعر"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  variant="outlined"
                  size="small"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={mutation.isPending}
                  onFocus={(e) => e.target.select()}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsOpen(false)} disabled={mutation.isPending} variant="outlined" size="small">
            إلغاء
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoadingServices || mutation.isPending}
            variant="contained"
            size="small"
            startIcon={mutation.isPending ? <CircularProgress size={16} /> : null}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddPartyServiceCostDialog;
