// src/components/companies/AddCompanyServiceDialog.tsx
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
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Autocomplete,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Add as PlusCircle, Close as CloseIcon } from '@mui/icons-material';

import type { CompanyServiceFormData } from '@/types/companies';
import type { Service } from '@/types/services';
import { getCompanyAvailableServices, addServiceToCompanyContract } from '@/services/companyService';

interface AddCompanyServiceDialogProps {
  companyId: number;
  companyName: string;
  onContractAdded: () => void; // To trigger actions on parent page if needed
  triggerButton?: React.ReactNode;
}

interface ContractFormValues {
  service_id: string;
  price: string;
  static_endurance: string;
  percentage_endurance: string;
  static_wage: string;
  percentage_wage: string;
  use_static: boolean;
  approval: boolean;
}

const AddCompanyServiceDialog: React.FC<AddCompanyServiceDialogProps> = ({ companyId, companyName, onContractAdded, triggerButton }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<ContractFormValues>({
    defaultValues: {
      service_id: '', 
      price: '0', 
      static_endurance: '0', 
      percentage_endurance: '0',
      static_wage: '0', 
      percentage_wage: '0', 
      use_static: false, 
      approval: true,
    },
    mode: 'onChange',
  });

  const { data: availableServices, isLoading: isLoadingServices } = useQuery<Service[], Error>({
    queryKey: ['companyAvailableServices', companyId],
    queryFn: () => getCompanyAvailableServices(companyId),
    enabled: isOpen, // Only fetch when dialog is open
  });

  const mutation = useMutation({
    mutationFn: (data: CompanyServiceFormData) => addServiceToCompanyContract(companyId, data),
    onSuccess: () => {
      toast.success("تم إضافة عقد الخدمة بنجاح!");
      queryClient.invalidateQueries({ queryKey: ['companyContractedServices', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companyAvailableServices', companyId] }); // Refetch available
      onContractAdded();
      form.reset();
      setIsOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "فشل في حفظ العقد";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: ContractFormValues) => {
    console.log(data,'data')
    const submissionData: CompanyServiceFormData = {
        ...data,
        // service_id is already string from select
    };
    mutation.mutate(submissionData);
  };
  
  // Reset form when dialog opens/closes or companyId changes
  useEffect(() => {
    if (!isOpen) {
        form.reset();
    }
  }, [isOpen, form, companyId]);

  // Get selected service for display
  const selectedServiceId = form.watch('service_id');
  const selectedService = availableServices?.find(service => service.id.toString() === selectedServiceId);

  return (
    <>
        {triggerButton || (
        <Button
          variant="contained"
          size="small"
          startIcon={<PlusCircle />}
          onClick={() => setIsOpen(true)}
        >
          إضافة عقد خدمة
          </Button>
        )}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">إضافة خدمة جديدة للشركة</Typography>
            <IconButton onClick={() => setIsOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            إضافة خدمة جديدة لشركة {companyName}
          </Typography>
          <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ mt: 2 }}>
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
                      sx={{ mb: 2 }}
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
                  message: "يرجى إدخال رقم صحيح"
                }
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
                  sx={{ mb: 2 }}
                />
              )}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Controller
                name="static_endurance"
                control={form.control}
                rules={{ 
                  pattern: {
                    value: /^\d+(\.\d+)?$/,
                    message: "يرجى إدخال رقم صحيح"
                  }
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="التحمل الثابت"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={mutation.isPending}
                  />
                )}
              />
              <Controller
                name="percentage_endurance"
                control={form.control}
                rules={{ 
                  pattern: {
                    value: /^(100(\.0+)?|[0-9]?[0-9](\.[0-9]+)?)$/,
                    message: "يرجى إدخال نسبة بين 0 و 100"
                  }
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="نسبة التحمل (%)"
                    type="number"
                    inputProps={{ step: "0.01", min: "0", max: "100" }}
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={mutation.isPending}
                  />
                )}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Controller
                name="static_wage"
                control={form.control}
                rules={{ 
                  pattern: {
                    value: /^\d+(\.\d+)?$/,
                    message: "يرجى إدخال رقم صحيح"
                  }
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="الأجر الثابت"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={mutation.isPending}
                  />
                )}
              />
              <Controller
                name="percentage_wage"
                control={form.control}
                rules={{ 
                  pattern: {
                    value: /^(100(\.0+)?|[0-9]?[0-9](\.[0-9]+)?)$/,
                    message: "يرجى إدخال نسبة بين 0 و 100"
                  }
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="نسبة الأجر (%)"
                    type="number"
                    inputProps={{ step: "0.01", min: "0", max: "100" }}
                    variant="outlined"
                    size="small"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={mutation.isPending}
                  />
                )}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Controller
                name="use_static"
                control={form.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={mutation.isPending}
                      />
                    }
                    label="استخدام القيم الثابتة"
                  />
                )}
              />
              <Controller
                name="approval"
                control={form.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={mutation.isPending}
                      />
                    }
                    label="الموافقة"
                  />
                )}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setIsOpen(false)}
            disabled={mutation.isPending}
            variant="outlined"
          >
            إلغاء
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoadingServices || mutation.isPending}
            variant="contained"
            startIcon={mutation.isPending ? <CircularProgress size={16} /> : null}
          >
            حفظ
              </Button>
        </DialogActions>
    </Dialog>
    </>
  );
};
export default AddCompanyServiceDialog;



