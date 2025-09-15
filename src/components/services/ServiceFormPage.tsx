// src/pages/services/ServiceFormPage.tsx
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardActions, Typography, TextField, FormControlLabel, Checkbox, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { type ServiceFormData, type Service, type ServiceGroup, ServiceFormMode } from '@/types/services';
import { createService, updateService, getServiceById } from '@/services/serviceService';
import { getServiceGroupsList } from '@/services/serviceGroupService';
import AddServiceGroupDialog from '@/components/services/AddServiceGroupDialog'; // Import dialog

interface ServiceFormPageProps { mode: ServiceFormMode; }

const serviceFormSchema = z.object({
  name: z.string().min(1, { message: 'الإسم مطلوب' }),
  service_group_id: z.string().min(1, { message: 'المجموعة مطلوبة' }),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'يجب أن يكون السعر رقمًا موجبًا' }),
  activate: z.boolean().default(false),
  variable: z.boolean().default(false),
});
type ServiceFormValues = z.infer<ReturnType<typeof getServiceFormSchema>>;

const ServiceFormPage: React.FC<ServiceFormPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === ServiceFormMode.EDIT;
  

  const { data: serviceData, isLoading: isLoadingService } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => getServiceById(Number(serviceId)).then(res => res.data),
    enabled: isEditMode && !!serviceId,
  });

  const { data: serviceGroups, isLoading: isLoadingServiceGroups } = useQuery({
    queryKey: ['serviceGroupsList'], 
    queryFn: getServiceGroupsList,
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '', service_group_id: undefined, price: '0',
      activate: true, // Default to active
      variable: false, // Default to not variable
    },
  });
  const { control, handleSubmit, reset, setValue, formState: { errors } } = form;

  useEffect(() => {
    if (isEditMode && serviceData) {
      reset({
        name: serviceData.name,
        service_group_id: String(serviceData.service_group_id),
        price: String(serviceData.price),
        activate: serviceData.activate,
        variable: serviceData.variable,
      });
    }
  }, [isEditMode, serviceData, reset]);

  const mutation = useMutation({
    mutationFn: (data: ServiceFormData) => 
        isEditMode && serviceId ? updateService(Number(serviceId), data) : createService(data),
    onSuccess: () => {
      toast.success('تم حفظ الخدمة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      if(isEditMode && serviceId) queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
      navigate('/settings/services');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حفظ الخدمة');
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    const submissionData: ServiceFormData = {
        ...data,
        price: String(data.price), // Service function will parse to float
    };
    mutation.mutate(submissionData);
  };
  
  const handleServiceGroupAdded = (newGroup: ServiceGroup) => {
    setValue('service_group_id', String(newGroup.id), { shouldValidate: true, shouldDirty: true });
  };

  const formIsSubmitting = mutation.isPending;
  const dataIsLoading = isLoadingService || isLoadingServiceGroups;

  if (isEditMode && isLoadingService) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> جاري التحميل...</div>;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <Typography variant="h6">{isEditMode ? 'تعديل خدمة' : 'إضافة خدمة'}</Typography>
        <Typography variant="body2" color="text.secondary">يرجى تعبئة البيانات التالية</Typography>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                label="الإسم"
                placeholder="أدخل اسم الخدمة"
                fullWidth
                size="small"
                disabled={dataIsLoading || formIsSubmitting}
                error={!!errors.name}
                helperText={errors.name?.message as string}
                {...field}
              />
            )}
          />

          <div className="flex items-center gap-2">
            <Controller
              name="service_group_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth size="small">
                  <InputLabel id="group-label">المجموعة</InputLabel>
                  <Select
                    labelId="group-label"
                    label="المجموعة"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(String(e.target.value))}
                    disabled={dataIsLoading || formIsSubmitting}
                  >
                    {isLoadingServiceGroups && (
                      <MenuItem value="loading" disabled>جاري التحميل...</MenuItem>
                    )}
                    {serviceGroups?.data?.map((sg) => (
                      <MenuItem key={sg.id} value={String(sg.id)}>{sg.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <AddServiceGroupDialog onServiceGroupAdded={handleServiceGroupAdded} />
          </div>

          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <TextField
                label="السعر"
                placeholder="0.00"
                type="number"
                inputProps={{ step: '0.01' }}
                fullWidth
                size="small"
                disabled={dataIsLoading || formIsSubmitting}
                error={!!errors.price}
                helperText={errors.price?.message as string}
                {...field}
              />
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Controller
              name="activate"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                  label="نشط"
                />
              )}
            />
            <Controller
              name="variable"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                  label="سعر متغير"
                />
              )}
            />
          </div>

          <CardActions className="justify-end gap-2">
            <Button variant="outlined" onClick={() => navigate('/settings/services')} disabled={formIsSubmitting}>إلغاء</Button>
            <Button type="submit" variant="contained" disabled={dataIsLoading || formIsSubmitting}>
              {formIsSubmitting && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
              حفظ
            </Button>
          </CardActions>
        </form>
      </CardContent>
    </Card>
  );
};
export default ServiceFormPage;