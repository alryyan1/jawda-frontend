// src/pages/lab/MainTestFormPage.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { Container } from '@/types/labTests';
import { createMainTest, updateMainTest, getMainTestById } from '@/services/mainTestService';
import { getContainers } from '@/services/containerService';
import AddContainerDialog from '@/components/lab/AddContainerDialog';

export const TestFormMode = {
  CREATE: 'create',
  EDIT: 'edit',
} as const;

export type TestFormMode = typeof TestFormMode[keyof typeof TestFormMode];

interface MainTestFormPageProps { 
  mode: TestFormMode;
}

const getMainTestFormSchema = (t: (key: string, options?: { field?: string; count?: number }) => string) => z.object({
  main_test_name: z.string().min(1, { message: t('common:validation.required', { field: t('labTests:form.nameLabel')}) }).max(70),
  pack_id: z.string().optional().refine(val => !val || /^\d*$/.test(val), { message: t('common:validation.mustBeIntegerOptional')}),
  pageBreak: z.boolean(),
  container_id: z.string().min(1, { message: t('common:validation.required', { field: t('labTests:form.containerLabel')}) }),
  price: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: t('common:validation.positiveNumberOptional')}),
  divided: z.boolean(),
  available: z.boolean(),
});

type MainTestFormSchema = ReturnType<typeof getMainTestFormSchema>;
type MainTestFormValues = z.infer<MainTestFormSchema>;

const MainTestFormPage: React.FC<MainTestFormPageProps> = ({ mode }) => {
  const { t, i18n } = useTranslation(['labTests', 'common']);
  const navigate = useNavigate();
  const { testId } = useParams<{ testId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === TestFormMode.EDIT;

  const mainTestFormSchema = getMainTestFormSchema(t);

  const { data: testData, isLoading: isLoadingTest, isFetching: isFetchingTest } = useQuery({
    queryKey: ['mainTest', testId],
    queryFn: () => getMainTestById(Number(testId)).then(res => res.data),
    enabled: isEditMode && !!testId,
  });

  const { data: containers = [], isLoading: isLoadingContainers } = useQuery({
    queryKey: ['containersList'],
    queryFn: () => getContainers().then(res => res.data),
  });

  const form = useForm<MainTestFormValues>({
    resolver: zodResolver(mainTestFormSchema),
    defaultValues: {
      main_test_name: '',
      pack_id: '',
      pageBreak: false,
      container_id: '',
      price: '',
      divided: false,
      available: true,
    },
  });

  const { control, handleSubmit, reset, setValue } = form;

  useEffect(() => {
    if (isEditMode && testData) {
      reset({
        main_test_name: testData.main_test_name,
        pack_id: testData.pack_id ? String(testData.pack_id) : '',
        pageBreak: testData.pageBreak || false,
        container_id: String(testData.container_id),
        price: testData.price ? String(testData.price) : '',
        divided: testData.divided || false,
        available: testData.available ?? true,
      });
    }
  }, [isEditMode, testData, reset]);

  const mutation = useMutation({
    mutationFn: (data: MainTestFormValues) => {
      const submissionData = {
        ...data,
        container_id: Number(data.container_id),
        pack_id: data.pack_id ? Number(data.pack_id) : null,
        price: data.price ? data.price : null,
      };
      return isEditMode && testId ? updateMainTest(Number(testId), submissionData) : createMainTest(submissionData);
    },
    onSuccess: () => {
      toast.success(t('labTests:form.testSavedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['mainTests'] });
      if(isEditMode && testId) queryClient.invalidateQueries({ queryKey: ['mainTest', testId] });
      navigate('/lab-tests');
    },
    onError: (error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } }; message?: string }) => {
      let errorMessage = t('labTests:form.testSaveError');
      if (error.response?.data?.errors) {
        const fieldErrors = Object.values(error.response.data.errors).flat().join(' ');
        errorMessage = `${errorMessage}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });
  
  const handleContainerAdded = (newContainer: Container) => {
    setValue('container_id', String(newContainer.id), { shouldValidate: true, shouldDirty: true });
  };

  const formIsSubmitting = mutation.isPending;
  const dataIsLoading = isLoadingTest || isFetchingTest || isLoadingContainers;

  if (isEditMode && isLoadingTest) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> {t('common:loading')}</div>;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? t('labTests:editTestTitle') : t('labTests:createTestTitle')}</CardTitle>
        <CardDescription>{t('common:form.fillDetails')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <FormField
              control={control}
              name="main_test_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labTests:form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('labTests:form.namePlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labTests:form.priceLabel')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder={t('labTests:form.pricePlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="pack_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labTests:form.packIdLabel')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={t('labTests:form.packIdPlaceholder')} {...field} disabled={dataIsLoading || formIsSubmitting}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={control}
              name="container_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labTests:form.containerLabel')}</FormLabel>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={dataIsLoading || formIsSubmitting} dir={i18n.dir()}>
                      <FormControl className="flex-grow">
                        <SelectTrigger>
                          <SelectValue placeholder={t('labTests:form.selectContainer')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingContainers ? (
                          <SelectItem value="loading_cont" disabled>{t('common:loading')}</SelectItem>
                        ) : (
                          containers.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.container_name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <AddContainerDialog onContainerAdded={handleContainerAdded} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 pt-2">
              <FormField
                control={control}
                name="pageBreak"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="font-normal">{t('labTests:form.pageBreakLabel')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={dataIsLoading || formIsSubmitting}/>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="divided"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="font-normal">{t('labTests:form.dividedLabel')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={dataIsLoading || formIsSubmitting}/>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="available"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <FormLabel className="font-normal">{t('labTests:form.availableLabel')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={dataIsLoading || formIsSubmitting}/>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/lab-tests')} disabled={formIsSubmitting}>
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={dataIsLoading || formIsSubmitting}>
                {formIsSubmitting && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('labTests:form.saveButton')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MainTestFormPage;