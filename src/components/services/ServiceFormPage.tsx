// src/pages/services/ServiceFormPage.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { type ServiceFormData, type Service, type ServiceGroup, ServiceFormMode } from '@/types/services';
import { createService, updateService, getServiceById } from '@/services/serviceService';
import { getServiceGroupsList } from '@/services/serviceGroupService';
import AddServiceGroupDialog from '@/components/services/AddServiceGroupDialog'; // Import dialog

interface ServiceFormPageProps { mode: ServiceFormMode; }

const getServiceFormSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('services:form.nameLabel')}) }),
  service_group_id: z.string().min(1, { message: t('common:validation.required', { field: t('services:form.groupLabel')}) }),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber')}), // Add positiveNumber to common.json
  activate: z.boolean().default(false),
  variable: z.boolean().default(false), // Schema had NOT NULL, so no default unless you change schema or add form default
});
type ServiceFormValues = z.infer<ReturnType<typeof getServiceFormSchema>>;

const ServiceFormPage: React.FC<ServiceFormPageProps> = ({ mode }) => {
  const { t } = useTranslation(['services', 'common']);
  const navigate = useNavigate();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === ServiceFormMode.EDIT;
  const serviceFormSchema = getServiceFormSchema(t);

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
  const { control, handleSubmit, reset, setValue } = form;

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
      toast.success(t('services:form.serviceSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['services'] });
      if(isEditMode && serviceId) queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
      navigate('/settings/services');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('services:form.serviceSaveError'));
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

  if (isEditMode && isLoadingService) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('common:loading')}</div>;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? t('services:editServiceTitle') : t('services:createServiceTitle')}</CardTitle>
        <CardDescription>{t('common:form.fillDetails')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('services:form.nameLabel')}</FormLabel>
                <FormControl><Input placeholder={t('services:form.namePlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={control} name="service_group_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('services:form.groupLabel')}</FormLabel>
                <div className="flex items-center gap-2">
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={dataIsLoading || formIsSubmitting}>
                    <FormControl className="flex-grow"><SelectTrigger>
                      <SelectValue placeholder={t('services:form.selectGroup')} />
                    </SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingServiceGroups ? <SelectItem value="loading" disabled>{t('common:loading')}</SelectItem> :
                       serviceGroups?.data?.map(sg => <SelectItem key={sg.id} value={String(sg.id)}>{sg.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <AddServiceGroupDialog onServiceGroupAdded={handleServiceGroupAdded} />
                </div>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('services:form.priceLabel')}</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder={t('services:form.pricePlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="activate" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 rtl:space-x-reverse">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                    <FormLabel className="font-normal">{t('services:form.activateLabel')}</FormLabel>
                </FormItem>
                )} />
                <FormField control={control} name="variable" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 rtl:space-x-reverse">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                    <FormLabel className="font-normal">{t('services:form.variableLabel')}</FormLabel>
                </FormItem>
                )} />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/services')} disabled={formIsSubmitting}>{t('common:cancel')}</Button>
              <Button type="submit" disabled={dataIsLoading || formIsSubmitting}>
                {formIsSubmitting && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('services:form.saveButton')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
export default ServiceFormPage;