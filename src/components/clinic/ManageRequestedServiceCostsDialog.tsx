// src/components/clinic/ManageRequestedServiceCostsDialog.tsx
import React, { useEffect, useCallback, useMemo } from 'react';
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
import { Form, FormField } from "@/components/ui/form";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash2, Save } from 'lucide-react';

import type { RequestedService, ServiceCost, SubServiceCost } from '@/types/services';
import { getSubServiceCostsList } from '@/services/subServiceCostService';
import { deleteRequestedServiceCost, createOrUpdateRequestedServiceCost, getCostsForRequestedService } from '@/services/requestedServiceCostService';
import { getServiceCostsForService } from '@/services/serviceCostService';

// Define RequestedServiceCost type since it's not exported from services
interface RequestedServiceCost {
  id: number;
  requested_service_id: number;
  sub_service_cost_id: number;
  service_cost_id: number;
  amount: number;
}

// Zod schema for a single requested service cost item
const requestedServiceCostItemSchema = z.object({
  id: z.number().optional().nullable(),
  sub_service_cost_id: z.string().min(1, "Cost type is required."),
  service_cost_id: z.string().min(1, "Cost definition is required."),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Amount must be a positive number." }),
});

type RequestedServiceCostFormItemValues = z.infer<typeof requestedServiceCostItemSchema>;

const manageReqServiceCostsSchema = z.object({
  costs: z.array(requestedServiceCostItemSchema),
});
type ManageReqServiceCostsFormValues = z.infer<typeof manageReqServiceCostsSchema>;

interface ManageRequestedServiceCostsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestedService: RequestedService;
  onCostsUpdated?: () => void;
}

interface ApiError {
  response?: { data?: { message?: string } };
}

const ManageRequestedServiceCostsDialog: React.FC<ManageRequestedServiceCostsDialogProps> = ({
  isOpen, onOpenChange, requestedService, onCostsUpdated
}) => {
  const { t, i18n } = useTranslation(['services', 'common', 'clinic']);
  const queryClient = useQueryClient();

  const reqServiceCostsQueryKey = useMemo(() => 
    ['costsForRequestedService', requestedService.id] as const,
    [requestedService.id]
  );

  const subServiceCostsQueryKey = useMemo(() => 
    ['subServiceCostsListForReqServiceCosts'] as const,
    []
  );

  const serviceCostDefinitionsQueryKey = useMemo(() => 
    ['serviceCostDefinitionsForService', requestedService.service_id] as const,
    [requestedService.service_id]
  );

  const { data: existingReqServiceCosts = [], isLoading: isLoadingExisting } = useQuery<RequestedServiceCost[], Error>({
    queryKey: reqServiceCostsQueryKey,
    queryFn: () => getCostsForRequestedService(requestedService.id),
    enabled: isOpen && !!requestedService.id,
  });

  const { data: subServiceCostTypes = [], isLoading: isLoadingSubTypes } = useQuery<SubServiceCost[], Error>({
    queryKey: subServiceCostsQueryKey,
    queryFn: getSubServiceCostsList,
    enabled: isOpen,
  });
  
  const { data: serviceCostDefinitions = [], isLoading: isLoadingDefinitions } = useQuery<ServiceCost[], Error>({
    queryKey: serviceCostDefinitionsQueryKey,
    queryFn: () => getServiceCostsForService(requestedService.service_id),
    enabled: isOpen && !!requestedService.service_id,
  });

  const form = useForm<ManageReqServiceCostsFormValues>({
    resolver: zodResolver(manageReqServiceCostsSchema),
    defaultValues: { costs: [] },
  });
  
  const { control, handleSubmit, reset, getValues, setValue } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "costs",
    keyName: "fieldId"
  });

  // Memoize the base calculation values
  const baseCalculationValues = useMemo(() => {
    const servicePrice = Number(requestedService.price) || 0;
    const serviceCount = Number(requestedService.count) || 1;
    const discount = Number(requestedService.discount) || 0;
    const endurance = Number(requestedService.endurance) || 0;
    return {
      servicePrice,
      serviceCount,
      discount,
      endurance,
      baseTotal: servicePrice * serviceCount,
      afterCostBase: (servicePrice * serviceCount) - discount - endurance
    };
  }, [requestedService.price, requestedService.count, requestedService.discount, requestedService.endurance]);

  // Memoize the calculation function
  const calculateAmount = useCallback((definition: ServiceCost) => {
    if (!definition) return 0;
    
    if (definition.fixed !== null && definition.fixed !== undefined) {
      return Number(definition.fixed);
    }
    
    if (definition.percentage !== null && definition.percentage !== undefined) {
      const baseAmount = definition.cost_type === 'after cost' 
        ? baseCalculationValues.afterCostBase
        : baseCalculationValues.baseTotal;
      return (baseAmount * Number(definition.percentage)) / 100;
    }
    
    return 0;
  }, [baseCalculationValues]);

  // Initialize form data only when necessary data is loaded
  useEffect(() => {
    if (!isOpen || isLoadingExisting || isLoadingDefinitions) return;

    const formattedCosts = existingReqServiceCosts.length > 0
      ? existingReqServiceCosts.map(rc => ({
          id: rc.id,
          sub_service_cost_id: String(rc.sub_service_cost_id),
          service_cost_id: String(rc.service_cost_id),
          amount: String(rc.amount),
        }))
      : serviceCostDefinitions.map(def => ({
          id: null,
          sub_service_cost_id: String(def.sub_service_cost_id),
          service_cost_id: String(def.id),
          amount: String(calculateAmount(def).toFixed(2)),
        }));

    reset({ costs: formattedCosts });
  }, [isOpen, isLoadingExisting, isLoadingDefinitions, existingReqServiceCosts, serviceCostDefinitions, calculateAmount, reset]);

  // Handle definition change
  const handleDefinitionChange = useCallback((index: number, serviceCostDefId: string) => {
    const definition = serviceCostDefinitions.find(def => String(def.id) === serviceCostDefId);
    if (!definition) {
      setValue(`costs.${index}.amount`, '');
      setValue(`costs.${index}.sub_service_cost_id`, '');
      return;
    }

    const calculatedAmount = calculateAmount(definition);
    setValue(`costs.${index}.amount`, calculatedAmount.toFixed(2));
    setValue(`costs.${index}.sub_service_cost_id`, String(definition.sub_service_cost_id));
  }, [serviceCostDefinitions, setValue, calculateAmount]);

  const saveOrUpdateMutation = useMutation<RequestedServiceCost, ApiError, RequestedServiceCostFormItemValues & { index: number }>({
    mutationFn: (data) => {
      const payload = {
          sub_service_cost_id: parseInt(data.sub_service_cost_id),
          service_cost_id: parseInt(data.service_cost_id), // The ID of the ServiceCost definition
          amount: parseFloat(data.amount),
      };
      return createOrUpdateRequestedServiceCost(requestedService.id, data.id, payload); // id is optional for create
    },
    onSuccess: (updatedItem, variables) => { 
      toast.success(variables.id ? t('common:updatedSuccess') : t('common:createdSuccess'));
      queryClient.invalidateQueries({ queryKey: reqServiceCostsQueryKey });
      if(onCostsUpdated) onCostsUpdated();
      // Optionally update the specific item in the useFieldArray if backend returns full item
      // update(variables.index, updatedItem); 
    },
    onError: (err:ApiError) => toast.error(err.response?.data?.message || t('common:error.saveFailed')),
  });
  
  const deleteReqServiceCostMutation = useMutation<void, ApiError, number>({
    mutationFn: (reqServiceCostId: number) => deleteRequestedServiceCost(reqServiceCostId),
    onSuccess: () => { 
      toast.success(t('common:deletedSuccess'));
      queryClient.invalidateQueries({ queryKey: reqServiceCostsQueryKey }); 
      if(onCostsUpdated) onCostsUpdated(); 
    },
    onError: (err:ApiError) => toast.error(err.response?.data?.message || t('common:error.deleteFailed')),
  });

  const onSubmit = () => { /* Batch save not primary, save per row */ };

  const handleSaveRow = (index: number) => {
    form.trigger(`costs.${index}`).then(isValid => {
        if (isValid) {
            const rowData = getValues(`costs.${index}`);
            saveOrUpdateMutation.mutate({ ...rowData, index });
        } else {
            toast.error(t('common:validation.checkErrorsInRow'));
        }
    });
  };

  const addNewCostField = () => {
    append({
        sub_service_cost_id: '',
        service_cost_id: '', // User will select a predefined ServiceCost definition
        amount: '',
        // 'name' is derived from selected service_cost_id
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl max-h-[85vh] flex flex-col"> {/* Adjusted width */}
        <DialogHeader>
          <DialogTitle>{t('clinic:requestedServiceCost.dialogTitle', { serviceName: requestedService.service?.name || 'Service' })}</DialogTitle>
          <DialogDescription>{t('clinic:requestedServiceCost.dialogDescription')}</DialogDescription>
        </DialogHeader>
        
        {isLoadingExisting || isLoadingSubTypes || isLoadingDefinitions ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
              <ScrollArea style={{direction: i18n.dir()}} className="flex-grow pr-1 -mr-2">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {/* <TableHead className="w-[180px]">{t('clinic:requestedServiceCost.costName')}</TableHead> */}
                      <TableHead className="w-[200px]">{t('clinic:requestedServiceCost.costDefinition')}</TableHead>
                      <TableHead className="w-[150px]">{t('clinic:requestedServiceCost.costType')}</TableHead>
                      <TableHead className="w-[120px] text-center">{t('clinic:requestedServiceCost.calculatedAmount')}</TableHead>
                      <TableHead className="w-[90px] text-center">{t('common:actions.openMenu')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((fieldItem, index) => (
                      <TableRow key={fieldItem.id}>
                        {/* <TableCell className="py-1">
                          <FormField control={control} name={`costs.${index}.name`} render={({ field: f }) => (
                            <Input {...f} className="h-7 text-xs" placeholder={t('clinic:requestedServiceCost.descriptionPlaceholder')} />
                          )}/>
                        </TableCell> */}
                        <TableCell className="py-1">
                           <FormField control={control} name={`costs.${index}.service_cost_id`} render={({ field: f }) => (
                              <Select 
                                value={f.value || ""} 
                                onValueChange={(value) => {
                                  f.onChange(value);
                                  handleDefinitionChange(index, value);
                                }} 
                                dir={i18n.dir()}
                              >
                                 <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t('clinic:requestedServiceCost.selectDefinition')} /></SelectTrigger>
                                 <SelectContent>
                                    {serviceCostDefinitions.map(def => (
                                       <SelectItem key={def.id} value={String(def.id)}>{def.name} ({def.sub_service_cost?.name || def.sub_service_cost_id})</SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           )}/>
                        </TableCell>
                        <TableCell className="py-1">
                           <FormField control={control} name={`costs.${index}.sub_service_cost_id`} render={({ field: f }) => (
                              <Select value={f.value || ""} onValueChange={f.onChange} dir={i18n.dir()} disabled>
                                 <SelectTrigger className="h-7 text-xs bg-muted/50">
                                    <SelectValue placeholder={t('clinic:requestedServiceCost.costTypeReadOnly')} />
                                 </SelectTrigger>
                                 <SelectContent>
                                    {subServiceCostTypes.map(type => (
                                       <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           )}/>
                        </TableCell>
                        <TableCell className="py-1">
                          <FormField control={control} name={`costs.${index}.amount`} render={({ field: f }) => (
                            <Input type="number" {...f} value={f.value || ''} className="h-7 text-xs text-center" placeholder={t('common:currencySymbolShort')} />
                          )}/>
                        </TableCell>
                        <TableCell className="py-1 text-center">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveRow(index)} disabled={saveOrUpdateMutation.isPending}>
                                {saveOrUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4 text-green-600"/>}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => fieldItem.id ? deleteReqServiceCostMutation.mutate(Number(fieldItem.id)) : remove(index)} disabled={deleteReqServiceCostMutation.isPending && deleteReqServiceCostMutation.variables === Number(fieldItem.id)}>
                                {deleteReqServiceCostMutation.isPending && deleteReqServiceCostMutation.variables === Number(fieldItem.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="pt-2 flex justify-start">
                <Button type="button" variant="outline" size="sm" onClick={addNewCostField} className="text-xs">
                  <PlusCircle className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1"/> {t('clinic:requestedServiceCost.addCostEntry')}
                </Button>
              </div>
              <DialogFooter className="mt-auto pt-4">
                <DialogClose asChild><Button type="button" variant="outline">{t('common:close')}</Button></DialogClose>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default ManageRequestedServiceCostsDialog;