// src/pages/companies/CompanyFormPage.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch'; // For boolean status
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { CompanyFormData, Company, FinanceAccount } from '@/types/companies'; // Ensure FinanceAccount is in companies.ts or imported
import { createCompany, updateCompany, getCompanyById } from '@/services/companyService';
import { getFinanceAccountsList } from '@/services/doctorService'; // Or a dedicated financeService

export enum CompanyFormMode { CREATE = 'create', EDIT = 'edit' }
interface CompanyFormPageProps { mode: CompanyFormMode; }

const getCompanyFormSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('companies:form.nameLabel')}) }),
  phone: z.string().min(1, { message: t('common:validation.required', { field: t('companies:form.phoneLabel')}) }),
  email: z.string().min(1,{message:t('common:validation.required',{field:t('companies:form.emailLabel')})}).email({ message: t('common:validation.invalidEmail') }), // Allow empty string or valid email
  status: z.boolean().default(true),
  lab_endurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber')}),
  service_endurance: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber')}),
  lab_roof: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, { message: t('common:validation.positiveInteger')}),
  service_roof: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, { message: t('common:validation.positiveInteger')}),
  finance_account_id: z.string().optional(),
});
type CompanyFormValues = z.infer<ReturnType<typeof getCompanyFormSchema>>;

const CompanyFormPage: React.FC<CompanyFormPageProps> = ({ mode }) => {
  const { t } = useTranslation(['companies', 'common']);
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === CompanyFormMode.EDIT;

  const companyFormSchema = getCompanyFormSchema(t);

  const { data: companyData, isLoading: isLoadingCompany, isFetching: isFetchingCompany } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => getCompanyById(Number(companyId)).then(res => res.data),
    enabled: isEditMode && !!companyId,
  });

  const { data: financeAccounts, isLoading: isLoadingFinanceAccounts } = useQuery<FinanceAccount[], Error>({
    queryKey: ['financeAccountsList'],
    queryFn: getFinanceAccountsList, // From doctorService or a new financeService
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '', phone: '', email: '', status: true,
      lab_endurance: '0', service_endurance: '0',
      lab_roof: '0', service_roof: '0',
      finance_account_id: undefined,
    },
  });
  const { control, handleSubmit, reset, setValue } = form;

  useEffect(() => {
    if (isEditMode && companyData) {
      reset({
        name: companyData.name,
        phone: companyData.phone || '',
        email: companyData.email || '',
        status: companyData.status,
        lab_endurance: String(companyData.lab_endurance),
        service_endurance: String(companyData.service_endurance),
        lab_roof: String(companyData.lab_roof),
        service_roof: String(companyData.service_roof),
        finance_account_id: companyData.finance_account_id ? String(companyData.finance_account_id) : undefined,
      });
    }
  }, [isEditMode, companyData, reset]);

  const mutation = useMutation({
    mutationFn: (data: CompanyFormData) => 
        isEditMode && companyId ? updateCompany(Number(companyId), data) : createCompany(data),
    onSuccess: () => {
      toast.success(t('companies:form.companySavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      if(isEditMode && companyId) queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      navigate('/settings/companies');
    },
    onError: (error: any) => {
      let errorMessage = t('common:error.saveFailed', { entity: t('companies:entityName', "Company") }); // Add entityName to companies.json
       if (error.response?.data?.errors) {
        const fieldErrors = Object.values(error.response.data.errors).flat().join(' ');
        errorMessage = `${errorMessage}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: CompanyFormValues) => {
    // Transform form values to match CompanyFormData expected by the service/backend
    const submissionData: CompanyFormData = {
      ...data,
      // Ensure numeric fields are numbers if service expects numbers, or keep as string if service handles parsing
      lab_endurance: parseFloat(data.lab_endurance),
      service_endurance: parseFloat(data.service_endurance),
      lab_roof: parseInt(data.lab_roof),
      service_roof: parseInt(data.service_roof),
      finance_account_id: data.finance_account_id ? parseInt(data.finance_account_id) : undefined,
    };
    mutation.mutate(submissionData);
  };

  const formIsSubmitting = mutation.isPending;
  const dataIsLoading = isLoadingCompany || isFetchingCompany || isLoadingFinanceAccounts;

  if (isEditMode && isLoadingCompany) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('common:loading')}</div>;

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? t('companies:editCompanyTitle') : t('companies:createCompanyTitle')}</CardTitle>
        <CardDescription>{t('common:form.fillDetails')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('companies:form.nameLabel')}</FormLabel>
                <FormControl><Input placeholder={t('companies:form.nameLabel')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="phone" render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('companies:form.phoneLabel')}</FormLabel>
                    <FormControl><Input type="tel" placeholder={t('companies:form.phoneLabel')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={control} name="email" render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('companies:form.emailLabel')}</FormLabel>
                    <FormControl><Input type="email" placeholder={t('companies:form.emailLabel')} {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>

            <FormField control={control} name="finance_account_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('companies:form.financeAccountLabel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={dataIsLoading || formIsSubmitting}>
                  <FormControl><SelectTrigger>
                    <SelectValue placeholder={t('companies:form.selectFinanceAccount')} />
                  </SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value=" ">{t('common:none')}</SelectItem>
                    {isLoadingFinanceAccounts ? <SelectItem value="loading_fa" disabled>{t('common:loading')}</SelectItem> :
                     financeAccounts?.map(fa => <SelectItem key={fa.id} value={String(fa.id)}>{fa.name} ({fa.code})</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="lab_endurance" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:form.labEnduranceLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="service_endurance" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:form.serviceEnduranceLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={control} name="lab_roof" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:form.labRoofLabel')}</FormLabel><FormControl><Input type="number" {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="service_roof" render={({ field }) => (
                    <FormItem><FormLabel>{t('companies:form.serviceRoofLabel')}</FormLabel><FormControl><Input type="number" {...field} disabled={dataIsLoading || formIsSubmitting}/></FormControl><FormMessage /></FormItem>
                )} />
            </div>

            <FormField control={control} name="status" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>{t('companies:form.statusLabel')}</FormLabel>
                  <FormDescription>
                    {field.value ? t('companies:table.active') : t('companies:table.inactive')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={dataIsLoading || formIsSubmitting}/>
                </FormControl>
              </FormItem>
            )} />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/settings/companies')} disabled={formIsSubmitting}>{t('common:cancel')}</Button>
              <Button type="submit" disabled={dataIsLoading || formIsSubmitting}>
                {formIsSubmitting && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('companies:form.saveButton')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
export default CompanyFormPage;