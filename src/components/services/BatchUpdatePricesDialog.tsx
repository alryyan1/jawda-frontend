// src/components/services/BatchUpdatePricesDialog.tsx (New File)
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle, Trash2, ShieldQuestion } from 'lucide-react';

// Services & Types
import { previewBatchUpdateServicePrices, executeBatchUpdateServicePrices } from '@/services/serviceService';
import type { BatchUpdatePayload } from '@/services/serviceService';
import { getServiceGroupsList } from '@/services/serviceGroupService';
import _debounce from 'lodash/debounce';
import { ScrollArea } from '../ui/scroll-area';

const conditionSchema = z.object({
  field: z.enum(['service_group_id', 'price', 'name']),
  operator: z.enum(['=', '!=', '<', '>', '<=', '>=', 'LIKE']),
  value: z.string().min(1, "Value is required"),
});

const formSchema = z.object({
  update_mode: z.enum(['increase', 'decrease']),
  update_type: z.enum(['percentage', 'fixed_amount']),
  update_value: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Must be a positive number"),
  conditions: z.array(conditionSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface BatchUpdatePricesDialogProps {
  children: React.ReactNode; // The trigger button
}

const BatchUpdatePricesDialog: React.FC<BatchUpdatePricesDialogProps> = ({ children }) => {
  const { t } = useTranslation(['services', 'common']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ count: number; message: string } | null>(null);

  const { data: serviceGroups = [] } = useQuery({ queryKey: ['serviceGroupsList'], queryFn: () => getServiceGroupsList().then(res => res.data) });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      update_mode: 'increase',
      update_type: 'percentage',
      update_value: '10',
      conditions: [],
    },
  });
  const { control, handleSubmit, watch, getValues } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });

  const watchedFormValues = watch();
  
  const previewMutation = useMutation({
    mutationFn: (payload: BatchUpdatePayload) => previewBatchUpdateServicePrices(payload),
    onSuccess: (data) => setPreviewResult({ count: data.affected_count, message: t('actions.previewAffects', { count: data.affected_count }) }),
    onError: () => setPreviewResult({ count: 0, message: t('common:error.previewFailed') }),
  });

  const debouncedPreview = useCallback(_debounce((values: FormValues) => {
    if (values.update_value && parseFloat(values.update_value) > 0) {
      previewMutation.mutate({
        ...values,
        update_value: parseFloat(values.update_value),
      });
    } else {
        setPreviewResult(null); // Clear preview if value is invalid
    }
  }, 700), []);

  useEffect(() => {
    if (isOpen && watchedFormValues.update_value && parseFloat(watchedFormValues.update_value) > 0) {
    debouncedPreview(watchedFormValues);
    } else if (isOpen && (!watchedFormValues.update_value || parseFloat(watchedFormValues.update_value) <= 0)) {
      setPreviewResult(null);
    }
  }, [watchedFormValues.update_value, watchedFormValues.update_mode, watchedFormValues.update_type, watchedFormValues.conditions, debouncedPreview, isOpen]);


  const executeMutation = useMutation({
    mutationFn: (payload: BatchUpdatePayload) => executeBatchUpdateServicePrices(payload),
    onSuccess: (data) => {
      toast.success(data.message || t('actions.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['services'] }); // Invalidate main services list
      setIsOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { message?: string } })?.data?.message 
        : 'Update failed';
      toast.error(errorMessage || t('common:error.updateFailed'));
    },
  });

  const onSubmit = (data: FormValues) => {
    if (!previewResult || previewResult.count === 0) {
        toast.warning(t('actions.noServicesToUpdateWarning'));
        return;
    }
    if (window.confirm(t('actions.confirmBatchUpdate', { count: previewResult.count }))) {
        executeMutation.mutate({
            ...data,
            update_value: parseFloat(data.update_value),
        });
    }
  };

  const getOperatorOptions = (field: 'service_group_id' | 'price' | 'name') => {
    switch(field) {
      case 'service_group_id':
        return [{ value: '=', label: t('operators.equals') }];
      case 'price':
        return [
          { value: '>', label: '>' }, { value: '<', label: '<' }, { value: '=', label: '=' },
          { value: '>=', label: '>=' }, { value: '<=', label: '<=' }, { value: '!=', label: '!=' }
        ];
      case 'name':
        return [{ value: 'LIKE', label: t('operators.contains') }];
      default:
        return [];
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('actions.batchUpdatePrices')}</DialogTitle>
          <DialogDescription>{t('actions.batchUpdateDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <ScrollArea className="flex-grow pr-3 -mr-3">
              <div className="space-y-4 p-1">
                {/* --- Update Action --- */}
                <div className="p-3 border rounded-lg">
                  <h4 className="text-sm font-medium mb-2">{t('actions.step1')}</h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <FormField name="update_mode" control={control} render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem><FormControl><RadioGroupItem value="increase" /></FormControl><FormLabel className="font-normal">{t('actions.increase')}</FormLabel></FormItem>
                        <FormItem><FormControl><RadioGroupItem value="decrease" /></FormControl><FormLabel className="font-normal">{t('actions.decrease')}</FormLabel></FormItem>
                      </RadioGroup>
                    )} />
                    <FormField name="update_value" control={control} render={({ field }) => (
                      <Input type="number" placeholder={t('actions.valuePlaceholder')} {...field} className="h-9" />
                    )} />
                    <FormField name="update_type" control={control} render={({ field }) => (
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem><FormControl><RadioGroupItem value="percentage" /></FormControl><FormLabel className="font-normal">{t('actions.byPercentage')}</FormLabel></FormItem>
                        <FormItem><FormControl><RadioGroupItem value="fixed_amount" /></FormControl><FormLabel className="font-normal">{t('actions.byAmount')}</FormLabel></FormItem>
                      </RadioGroup>
                    )} />
                  </div>
                  <FormMessage>{form.formState.errors.update_value?.message}</FormMessage>
                </div>
                
                {/* --- Conditions --- */}
                <div className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">{t('actions.step2')}</h4>
                    <Button type="button" size="sm" variant="outline" onClick={() => append({ field: 'service_group_id', operator: '=', value: '' })}>
                      <PlusCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" /> {t('actions.addCondition')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {fields.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{t('actions.noConditions')}</p>}
                    {fields.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                        <Controller name={`conditions.${index}.field`} control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="service_group_id">{t('actions.fields.group')}</SelectItem>
                                    <SelectItem value="price">{t('actions.fields.price')}</SelectItem>
                                    <SelectItem value="name">{t('actions.fields.name')}</SelectItem>
                                </SelectContent>
                            </Select>
                        )} />
                         <Controller name={`conditions.${index}.operator`} control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {getOperatorOptions(getValues(`conditions.${index}.field`)).map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )} />
                        <Controller name={`conditions.${index}.value`} control={control} render={({ field }) => {
                            const conditionField = getValues(`conditions.${index}.field`);
                            return conditionField === 'service_group_id' ? (
                                <Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="flex-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{serviceGroups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}</SelectContent></Select>
                            ) : ( <Input {...field} className="flex-1 h-9 text-xs" /> )
                        }}/>
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- Preview --- */}
                 <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center gap-2 text-sm">
                    <ShieldQuestion className="h-5 w-5 text-blue-500"/>
                    <span className="font-medium">
                        {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : (previewResult?.message || t('actions.adjustToSeePreview'))}
                    </span>
                 </div>

              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="secondary" disabled={executeMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={executeMutation.isPending || previewMutation.isPending || !previewResult || previewResult.count === 0}>
                {executeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                {t('actions.executeUpdateButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default BatchUpdatePricesDialog;