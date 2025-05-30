// src/components/services/ManageServiceCostsDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash2, Save } from 'lucide-react';

import type { Service, ServiceCost, SubServiceCost } from '@/types/services';
import { 
    getSubServiceCostsList,
} from '@/services/subServiceCostService';
import { 
    deleteServiceCost, 
    createServiceCost, 
    getServiceCostsForService, 
    updateServiceCost 
} from '@/services/serviceCostService';
import AddSubServiceCostDialog from './AddSubServiceCostDialog';

// Zod schema for a single service cost item
const serviceCostItemSchema = z.object({
  id: z.number().optional().nullable(),
  sub_service_cost_id: z.string().min(1, "Cost type selection is required."), 
  cost_type: z.enum(['total', 'after cost'], { required_error: "Cost basis is required." }),
  percentage: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100), { message: "0-100 or empty" }).optional().nullable(),
  fixed: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "Positive or empty" }).optional().nullable(),
}).refine(data => (data.percentage && data.percentage !== '') || (data.fixed && data.fixed !== ''), {
  message: "Either percentage or fixed amount is required.",
  path: ["percentage"],
});

type ServiceCostFormItemValues = z.infer<typeof serviceCostItemSchema>;

const manageServiceCostsSchema = z.object({
  costs: z.array(serviceCostItemSchema),
});
type ManageServiceCostsFormValues = z.infer<typeof manageServiceCostsSchema>;

interface ManageServiceCostsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service;
  onCostsUpdated?: () => void;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const ManageServiceCostsDialog: React.FC<ManageServiceCostsDialogProps> = ({
  isOpen, onOpenChange, service, onCostsUpdated
}) => {
  const { t, i18n } = useTranslation(['services', 'common']);
  const queryClient = useQueryClient();
  const [isAddSubTypeDialogOpen, setIsAddSubTypeDialogOpen] = useState(false);
  const [focusedRowIndexForSubTypeAdd, setFocusedRowIndexForSubTypeAdd] = useState<number | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  const serviceCostsQueryKey = React.useMemo(() => ['serviceCostsForService', service.id] as const, [service.id]);
  const subServiceCostsQueryKey = React.useMemo(() => ['subServiceCostsList'] as const, []);

  const { data: existingServiceCosts = [], isLoading: isLoadingExistingCosts } = useQuery<ServiceCost[], Error>({
    queryKey: serviceCostsQueryKey,
    queryFn: () => getServiceCostsForService(service.id),
    enabled: isOpen && !!service.id,
    staleTime: 1000 * 60 * 1,
  });

  const { data: subServiceCostTypes = [], isLoading: isLoadingSubTypes } = useQuery<SubServiceCost[], Error>({
    queryKey: subServiceCostsQueryKey,
    queryFn: getSubServiceCostsList,
    enabled: isOpen,
    staleTime: 1000 * 60 * 1,
  });

  const form = useForm<ManageServiceCostsFormValues>({
    resolver: zodResolver(manageServiceCostsSchema),
    defaultValues: { costs: [] },
  });

  const { control, handleSubmit, reset, getValues, setValue } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "costs",
    keyName: "fieldId"
  });

  // Initialize form data only once when costs are loaded
  useEffect(() => {
    if (isOpen && existingServiceCosts && !isInitialized) {
      const formattedCosts = existingServiceCosts.map(sc => ({
        id: sc.id,
        sub_service_cost_id: String(sc.sub_service_cost_id),
        cost_type: sc.cost_type,
        percentage: sc.percentage !== null ? String(sc.percentage) : '',
        fixed: sc.fixed !== null ? String(sc.fixed) : '',
      }));
      reset({ costs: formattedCosts });
      setIsInitialized(true);
    }
  }, [isOpen, existingServiceCosts, reset, isInitialized]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      reset({ costs: [] });
      setIsAddSubTypeDialogOpen(false);
      setFocusedRowIndexForSubTypeAdd(undefined);
      setIsInitialized(false);
    }
  }, [isOpen, reset]);

  const createMutation = useMutation<ServiceCost, ApiError, ServiceCostFormItemValues>({
    mutationFn: (data: ServiceCostFormItemValues) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = data;
      // Find the selected sub-service cost to get its name
      const selectedSubServiceCost = subServiceCostTypes.find(
        type => type.id === parseInt(data.sub_service_cost_id)
      );
      if (!selectedSubServiceCost) {
        throw new Error('Selected sub-service cost not found');
      }
      const payload = {
        ...rest,
        name: selectedSubServiceCost.name, // Use the sub-service cost name
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        fixed: data.fixed ? parseFloat(data.fixed) : null,
        sub_service_cost_id: parseInt(data.sub_service_cost_id),
      };
      return createServiceCost(service.id, payload);
    },
    onSuccess: () => {
      toast.success(t('services:serviceCost.addedSuccess'));
      queryClient.invalidateQueries({ queryKey: serviceCostsQueryKey });
      if (onCostsUpdated) onCostsUpdated();
    },
    onError: (err: ApiError) => toast.error(err.response?.data?.message || t('common:error.createFailed')),
  });

  const updateMutation = useMutation<ServiceCost, ApiError, ServiceCostFormItemValues>({
    mutationFn: (data: ServiceCostFormItemValues) => {
      // Find the selected sub-service cost to get its name
      const selectedSubServiceCost = subServiceCostTypes.find(
        type => type.id === parseInt(data.sub_service_cost_id)
      );
      if (!selectedSubServiceCost) {
        throw new Error('Selected sub-service cost not found');
      }
      const payload = {
        name: selectedSubServiceCost.name, // Use the sub-service cost name
        sub_service_cost_id: parseInt(data.sub_service_cost_id),
        cost_type: data.cost_type,
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        fixed: data.fixed ? parseFloat(data.fixed) : null,
      };
      return updateServiceCost(data.id!, payload);
    },
    onSuccess: () => {
      toast.success(t('services:serviceCost.updatedSuccess'));
      queryClient.invalidateQueries({ queryKey: serviceCostsQueryKey });
      if (onCostsUpdated) onCostsUpdated();
    },
    onError: (err: ApiError) => toast.error(err.response?.data?.message || t('common:error.updateFailed')),
  });
  
  const deleteMutation = useMutation<void, ApiError, number>({
    mutationFn: (serviceCostId: number) => deleteServiceCost(serviceCostId),
    onSuccess: () => {
      toast.success(t('common:deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: serviceCostsQueryKey });
      if (onCostsUpdated) onCostsUpdated();
    },
    onError: (err: ApiError) => toast.error(err.response?.data?.message || t('common:error.deleteFailed')),
  });

  const onSubmit = useCallback(() => {
    toast.info("Per-row save is active. Click the save icon on each row.");
  }, []);

  const handleSaveRow = useCallback((index: number) => {
    form.trigger(`costs.${index}`).then(isValid => {
      if (isValid) {
        const rowData = getValues(`costs.${index}`);
        if (rowData.id) {
          updateMutation.mutate(rowData);
        } else {
          createMutation.mutate(rowData);
        }
      } else {
        toast.error(t('common:validation.checkErrorsInRow'));
      }
    });
  }, [form, getValues, updateMutation, createMutation, t]);

  const handleSubServiceCostTypeAdded = useCallback(async (newSubType: SubServiceCost) => {
    if (focusedRowIndexForSubTypeAdd !== undefined) {
      setValue(`costs.${focusedRowIndexForSubTypeAdd}.sub_service_cost_id`, String(newSubType.id), {
        shouldValidate: true,
        shouldDirty: true
      });
    }
    
    toast.success(t('services:subServiceCostType.addedToList', { name: newSubType.name }));
    setIsAddSubTypeDialogOpen(false);
    setFocusedRowIndexForSubTypeAdd(undefined);
    
    // Invalidate query after state updates
    await queryClient.invalidateQueries({ queryKey: subServiceCostsQueryKey });
  }, [setValue, queryClient, subServiceCostsQueryKey, focusedRowIndexForSubTypeAdd, t]);

  const addNewCostField = useCallback(() => {
    append({
      sub_service_cost_id: '',
      cost_type: 'total',
      percentage: '',
      fixed: '',
    }, { shouldFocus: false });
  }, [append]);

  // Memoize translations to prevent unnecessary re-renders
  const translations = React.useMemo(() => ({
    dialogTitle: service.name ? t('services:manageServiceCostsDialog.title', { serviceName: service.name }) : '',
    dialogDescription: t('services:manageServiceCostsDialog.description'),
    costType: t('services:serviceCost.costType'),
    costItemDescription: t('services:serviceCost.description'),
    basis: t('services:serviceCost.basis'),
    percentage: t('services:serviceCost.percentage'),
    fixedAmount: t('services:serviceCost.fixedAmount'),
    actions: t('common:actions'),
    selectType: t('services:serviceCost.selectType'),
    costItemNamePlaceholder: t('services:serviceCost.costItemNamePlaceholder'),
    costTypeTotal: t('services:serviceCost.costTypeEnum.total'),
    costTypeAfterCost: t('services:serviceCost.costTypeEnum.after_cost'),
    addCostItem: t('services:serviceCost.addCostItem'),
    close: t('common:close'),
    currencySymbol: t('common:currencySymbolShort'),
    validationCheckErrors: t('common:validation.checkErrorsInRow')
  }), [service.name, t]);

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{translations.dialogTitle}</DialogTitle>
            <DialogDescription>{translations.dialogDescription}</DialogDescription>
          </DialogHeader>
          
          {isLoadingExistingCosts || isLoadingSubTypes ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
                <ScrollArea style={{direction: i18n.dir()}} className="flex-grow pr-1 -mr-2">
                  <Table className="text-xs min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px] text-center">{translations.costType}</TableHead>
                        <TableHead className="w-[130px] text-center">{translations.basis}</TableHead>
                        <TableHead className="w-[100px] text-center">{translations.percentage}</TableHead>
                        <TableHead className="w-[100px] text-center">{translations.fixedAmount}</TableHead>
                        <TableHead className="w-[90px] text-center">{t('common:actions.openMenu')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((fieldItem, index) => (
                        <TableRow key={fieldItem.id}>
                          <TableCell className="py-1 align-top">
                            <FormField
                              control={control}
                              name={`costs.${index}.sub_service_cost_id`}
                              render={({ field: f }) => (
                                <div className="flex items-center gap-1">
                                  <Select
                                    value={f.value || ""}
                                    onValueChange={f.onChange}
                                    dir={i18n.dir()}
                                    disabled={isLoadingSubTypes}
                                  >
                                    <SelectTrigger className="h-7 text-xs flex-grow">
                                      <SelectValue placeholder={translations.selectType} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {subServiceCostTypes.map(type => (
                                        <SelectItem key={type.id} value={String(type.id)}>
                                          {type.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => {
                                      setFocusedRowIndexForSubTypeAdd(index);
                                      setIsAddSubTypeDialogOpen(true);
                                    }}
                                  >
                                    <PlusCircle className="h-3.5 w-3.5"/>
                                  </Button>
                                </div>
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1 align-top">
                            <FormField
                              control={control}
                              name={`costs.${index}.cost_type`}
                              render={({ field: f }) => (
                                <Select value={f.value || "total"} onValueChange={f.onChange} dir={i18n.dir()}>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="total">{translations.costTypeTotal}</SelectItem>
                                    <SelectItem value="after cost">{translations.costTypeAfterCost}</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1 align-top">
                            <FormField
                              control={control}
                              name={`costs.${index}.percentage`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  {...f}
                                  value={f.value || ''}
                                  className="h-7 text-xs text-center"
                                  placeholder="%"
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1 align-top">
                            <FormField
                              control={control}
                              name={`costs.${index}.fixed`}
                              render={({ field: f }) => (
                                <Input
                                  type="number"
                                  {...f}
                                  value={f.value || ''}
                                  className="h-7 text-xs text-center"
                                  placeholder={translations.currencySymbol}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="py-1 text-center align-top">
                            <div className="flex items-center justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleSaveRow(index)}
                                disabled={createMutation.isPending || updateMutation.isPending}
                              >
                                {(createMutation.isPending && !fieldItem.id || updateMutation.isPending && updateMutation.variables?.id === fieldItem.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                  <Save className="h-4 w-4 text-green-600"/>
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => fieldItem.id ? deleteMutation.mutate(Number(fieldItem.id)) : remove(index)}
                                disabled={deleteMutation.isPending && deleteMutation.variables === Number(fieldItem.id)}
                              >
                                {deleteMutation.isPending && deleteMutation.variables === Number(fieldItem.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                  <Trash2 className="h-4 w-4"/>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <div className="pt-2 flex justify-start">
                  <Button type="button" variant="outline" size="sm" onClick={addNewCostField} className="text-xs">
                    <PlusCircle className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1"/> {translations.addCostItem}
                  </Button>
                </div>
                <DialogFooter className="mt-auto pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">{translations.close}</Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {isAddSubTypeDialogOpen && (
        <AddSubServiceCostDialog
          isOpen={isAddSubTypeDialogOpen}
          onOpenChange={setIsAddSubTypeDialogOpen}
          onSubServiceCostAdded={handleSubServiceCostTypeAdded}
        />
      )}
    </>
  );
};

export default React.memo(ManageServiceCostsDialog);