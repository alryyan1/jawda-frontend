// src/components/companies/AddCompanyMainTestDialog.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';

import type { CompanyMainTestFormData } from '@/types/companies';
import type { MainTestStripped } from '@/types/labTests';
import { getCompanyAvailableMainTests, addMainTestToCompanyContract } from '@/services/companyService';

interface AddCompanyMainTestDialogProps {
  companyId: number;
  companyName: string;
  onContractAdded: () => void;
  triggerButton?: React.ReactNode;
}

const testContractSchema = z.object({
  main_test_id: z.string().min(1),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0),
  status: z.boolean(),
  approve: z.boolean(),
  endurance_static: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0),
  endurance_percentage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100),
  use_static: z.boolean(),
});

type TestContractFormValues = z.infer<typeof testContractSchema>;

interface MainTestStrippedWithPrice extends MainTestStripped {
  price: number;
  main_test_name: string;
  id: number;
}

const AddCompanyMainTestDialog: React.FC<AddCompanyMainTestDialogProps> = ({ 
    companyId, companyName, onContractAdded, triggerButton 
}) => {
  const { t, i18n } = useTranslation(['companies', 'common', 'labTests']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<TestContractFormValues>({
    resolver: zodResolver(testContractSchema),
    defaultValues: {
      main_test_id: '', 
      price: '0', 
      status: true, 
      approve: true,
      endurance_static: '0', 
      endurance_percentage: '0', 
      use_static: false,
    },
  });

  const availableTestsQueryKey = ['companyAvailableMainTests', companyId] as const;
  const { data: availableMainTests, isLoading: isLoadingTests } = useQuery<MainTestStrippedWithPrice[]>({
    queryKey: availableTestsQueryKey,
    queryFn: async () => {
      const response = await getCompanyAvailableMainTests(companyId);
      return response as MainTestStrippedWithPrice[];
    },
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (data: CompanyMainTestFormData) => addMainTestToCompanyContract(companyId, data),
    onSuccess: () => {
      toast.success(t('companies:testContracts.addedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['companyContractedMainTests', companyId] });
      queryClient.invalidateQueries({ queryKey: availableTestsQueryKey });
      onContractAdded();
      form.reset();
      setIsOpen(false);
    },
    onError: (error: { response?: { data?: { errors?: { main_test_id?: string[] }, message?: string } } }) => {
      let errorMessage = t('common:error.saveFailed', { entity: t('companies:testContracts.contractEntityName', "Test Contract") });
      if (error.response?.data?.errors?.main_test_id?.[0]?.includes('already been taken')) {
        errorMessage = t('companies:testContracts.alreadyExistsError', "This test is already in the contract.");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    },
  });

  const onSubmit: SubmitHandler<TestContractFormValues> = (data) => {
    const submissionData: CompanyMainTestFormData = {
      main_test_id: data.main_test_id,
      price: data.price,
      status: data.status,
      approve: data.approve,
      endurance_static: data.endurance_static,
      endurance_percentage: data.endurance_percentage,
      use_static: data.use_static,
    };
    mutation.mutate(submissionData);
  };
  
  // Auto-fill price from selected test's default price
  const selectedTestId = form.watch('main_test_id');
  useEffect(() => {
    if (selectedTestId && availableMainTests) {
      const test = availableMainTests.find(s => String(s.id) === selectedTestId);
      if (test && test.price !== undefined && (form.getValues('price') === '0' || !form.formState.dirtyFields.price)) {
        form.setValue('price', String(test.price));
      }
    }
  }, [selectedTestId, availableMainTests, form]);

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        main_test_id: '',
        price: '0',
        status: true,
        approve: true,
        endurance_static: '0',
        endurance_percentage: '0',
        use_static: false,
      });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm">
            <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {t('companies:testContracts.addContractButton')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('companies:addTestContractDialog.title')}</DialogTitle>
          <DialogDescription>{t('companies:addTestContractDialog.description', { companyName })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto px-1">
            <FormField
              control={form.control}
              name="main_test_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companies:addTestContractDialog.testLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isLoadingTests || mutation.isPending} dir={i18n.dir()}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('companies:addTestContractDialog.selectTest')} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingTests && <div className="p-2 text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>}
                      {availableMainTests?.map(test => (
                        <SelectItem key={test.id} value={String(test.id)}>
                          {test.main_test_name} ({t('common:price')}: {Number(test.price).toFixed(2)})
                        </SelectItem>
                      ))}
                      {(!availableMainTests || availableMainTests.length === 0) && !isLoadingTests && (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          {t('companies:addTestContractDialog.noAvailableTests')}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('companies:addTestContractDialog.priceLabel')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} disabled={mutation.isPending}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="endurance_static"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('companies:addTestContractDialog.enduranceStaticLabel')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} disabled={mutation.isPending} className="h-9"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endurance_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t('companies:addTestContractDialog.endurancePercentageLabel')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} disabled={mutation.isPending} className="h-9"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 rtl:space-x-reverse space-y-0 rounded-md border p-3 h-10">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={mutation.isPending}/>
                    </FormControl>
                    <FormLabel className="font-normal text-xs">{t('companies:addTestContractDialog.statusLabel')}</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="approve"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 rtl:space-x-reverse space-y-0 rounded-md border p-3 h-10">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={mutation.isPending}/>
                    </FormControl>
                    <FormLabel className="font-normal text-xs">{t('companies:addTestContractDialog.approvalLabel')}</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="use_static"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 rtl:space-x-reverse space-y-0 rounded-md border p-3 h-10">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={mutation.isPending}/>
                    </FormControl>
                    <FormLabel className="font-normal text-xs">{t('companies:addTestContractDialog.useStaticLabel')}</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={mutation.isPending}>
                  {t('common:cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoadingTests || mutation.isPending}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyMainTestDialog;