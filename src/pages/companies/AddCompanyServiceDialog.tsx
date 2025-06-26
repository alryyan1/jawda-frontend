// src/components/companies/AddCompanyServiceDialog.tsx
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';

import type { CompanyServiceFormData } from '@/types/companies';
import type { Service } from '@/types/services';
import { getCompanyAvailableServices, addServiceToCompanyContract } from '@/services/companyService';
import { Autocomplete, CircularProgress, Paper, TextField } from '@mui/material';

interface AddCompanyServiceDialogProps {
  companyId: number;
  companyName: string;
  onContractAdded: () => void; // To trigger actions on parent page if needed
  triggerButton?: React.ReactNode;
}

const getContractFormSchema = (t: (key: string, options?: Record<string, unknown>) => string) => z.object({
  service_id: z.string().min(1, { message: t('common:validation.required', { field: t('companies:addServiceContractDialog.serviceLabel') }) }),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber') }),
  static_endurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber') }),
  percentage_endurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, { message: "0-100" }),
  static_wage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber') }),
  percentage_wage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100, { message: "0-100" }),
  use_static: z.boolean(),
  approval: z.boolean(),
});

type ContractFormValues = z.infer<ReturnType<typeof getContractFormSchema>>;

const AddCompanyServiceDialog: React.FC<AddCompanyServiceDialogProps> = ({ companyId, companyName, onContractAdded, triggerButton }) => {
  const { t } = useTranslation(['companies', 'common', 'services']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const contractFormSchema = getContractFormSchema(t);
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
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
  });

  const { data: availableServices, isLoading: isLoadingServices } = useQuery<Service[], Error>({
    queryKey: ['companyAvailableServices', companyId],
    queryFn: () => getCompanyAvailableServices(companyId),
    enabled: isOpen, // Only fetch when dialog is open
  });

  const mutation = useMutation({
    mutationFn: (data: CompanyServiceFormData) => addServiceToCompanyContract(companyId, data),
    onSuccess: () => {
      toast.success(t('companies:serviceContracts.addedSuccess', "Service contract added successfully!"));
      queryClient.invalidateQueries({ queryKey: ['companyContractedServices', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companyAvailableServices', companyId] }); // Refetch available
      onContractAdded();
      form.reset();
      setIsOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('common:error.saveFailed', { entity: "Contract" });
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm">
            <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {t('companies:serviceContracts.addContractButton')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('companies:addServiceContractDialog.title')}</DialogTitle>
          <DialogDescription>{t('companies:addServiceContractDialog.description', { companyName })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <Controller
              name="service_id"
              control={form.control}
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
                      label={t('companies:contracts.serviceName')}
                      variant="outlined"
                      size="small"
                      error={!!form.formState.errors.service_id}
                      helperText={form.formState.errors.service_id?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isLoadingServices ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'hsl(var(--border))',
                          },
                          '&:hover fieldset': {
                            borderColor: 'hsl(var(--border))',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'hsl(var(--ring))',
                          },
                          backgroundColor: 'hsl(var(--background))',
                          color: 'hsl(var(--foreground))',
                        },
                        '& .MuiInputLabel-root': {
                          color: 'hsl(var(--muted-foreground))',
                          '&.Mui-focused': {
                            color: 'hsl(var(--ring))',
                          },
                        },
                      }}
                    />
                  )}
               
                  
                />
              )}
            />
            <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>{t('companies:addServiceContractDialog.priceLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={mutation.isPending}/></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="static_endurance" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:addServiceContractDialog.staticEnduranceLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={mutation.isPending}/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="percentage_endurance" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:addServiceContractDialog.percentageEnduranceLabel')}</FormLabel><FormControl><Input type="number" step="0.01" min="0" max="100" {...field} disabled={mutation.isPending}/></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="static_wage" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:addServiceContractDialog.staticWageLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={mutation.isPending}/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="percentage_wage" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:addServiceContractDialog.percentageWageLabel')}</FormLabel><FormControl><Input type="number" step="0.01" min="0" max="100" {...field} disabled={mutation.isPending}/></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField control={form.control} name="use_static" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse rounded-md border p-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={mutation.isPending}/></FormControl>
                        <FormLabel className="font-normal">{t('companies:addServiceContractDialog.useStaticLabel')}</FormLabel>
                    </FormItem>
                )} />
                <FormField control={form.control} name="approval" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse rounded-md border p-3">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={mutation.isPending}/></FormControl>
                        <FormLabel className="font-normal">{t('companies:addServiceContractDialog.approvalLabel')}</FormLabel>
                    </FormItem>
                )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={isLoadingServices || mutation.isPending}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default AddCompanyServiceDialog;



