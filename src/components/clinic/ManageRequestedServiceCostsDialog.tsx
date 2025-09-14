// src/components/clinic/ManageRequestedServiceCostsDialog.tsx
import React, { useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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

// Form interfaces
interface RequestedServiceCostFormItemValues {
  sub_service_cost_id: string;
  service_cost_id: string;
  amount: string;
}

interface ManageReqServiceCostsFormValues {
  costs: RequestedServiceCostFormItemValues[];
}

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
          amount: String(calculateAmount.toFixed(2)),
        }));

    reset({
      costs: existingReqServiceCosts.length > 0 
        ? existingReqServiceCosts.map(cost => ({
            sub_service_cost_id: String(cost.sub_service_cost_id),
            service_cost_id: String(cost.service_cost_id),
            amount: String(cost.amount),
          }))
        : serviceCostDefinitions.map(def => ({
            sub_service_cost_id: String(def.sub_service_cost_id),
            service_cost_id: String(def.id),
            amount: String(calculateAmount.toFixed(2)),
          }))
    });
  }, [isOpen, isLoadingExisting, isLoadingDefinitions, existingReqServiceCosts, serviceCostDefinitions, calculateAmount, reset]);

  // Handle definition change
  const handleDefinitionChange = useCallback((index: number, serviceCostDefId: string) => {
    const definition = serviceCostDefinitions.find(def => String(def.id) === serviceCostDefId);
    if (!definition) {
      setValue(`costs.${index}.amount`, '');
      setValue(`costs.${index}.sub_service_cost_id`, '');
      return;
    }

    const calculatedAmount = calculateAmount;
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
      return createOrUpdateRequestedServiceCost(requestedService.id, payload); // id is optional for create
    },
    onSuccess: (updatedItem, variables) => { 
      toast.success(variables.id ? "تم تحديث التكلفة بنجاح" : "تم إضافة التكلفة بنجاح");
      queryClient.invalidateQueries({ queryKey: reqServiceCostsQueryKey });
      if(onCostsUpdated) onCostsUpdated();
      // Optionally update the specific item in the useFieldArray if backend returns full item
      // update(variables.index, updatedItem); 
    },
    onError: (err:ApiError) => toast.error(err.response?.data?.message || "فشل في حفظ التكلفة"),
  });
  
  const deleteReqServiceCostMutation = useMutation<void, ApiError, number>({
    mutationFn: (reqServiceCostId: number) => deleteRequestedServiceCost(reqServiceCostId),
    onSuccess: () => { 
      toast.success("تم حذف التكلفة بنجاح");
      queryClient.invalidateQueries({ queryKey: reqServiceCostsQueryKey }); 
      if(onCostsUpdated) onCostsUpdated(); 
    },
    onError: (err:ApiError) => toast.error(err.response?.data?.message || "فشل في حذف التكلفة"),
  });

  const onSubmit = () => { /* Batch save not primary, save per row */ };

  const handleSaveRow = (index: number) => {
    form.trigger(`costs.${index}`).then(isValid => {
        if (isValid) {
            const rowData = getValues(`costs.${index}`);
            saveOrUpdateMutation.mutate({ ...rowData, index });
        } else {
            toast.error("يرجى تصحيح الأخطاء في النموذج");
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
          <DialogTitle>{"إدارة تكاليف الخدمة"}</DialogTitle>
          <DialogDescription>{"إضافة وتعديل تكاليف الخدمة المطلوبة"}</DialogDescription>
        </DialogHeader>
        
        {isLoadingExisting || isLoadingSubTypes || isLoadingDefinitions ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
              <ScrollArea style={{direction: true}} className="flex-grow pr-1 -mr-2">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      {/* <TableHead className="w-[180px]">{"نص"}</TableHead> */}
                      <TableHead className="w-[200px]">{"نوع التكلفة"}</TableHead>
                      <TableHead className="w-[150px]">{"التعريف"}</TableHead>
                      <TableHead className="w-[120px] text-center">{"المبلغ"}</TableHead>
                      <TableHead className="w-[90px] text-center">{"الإجراءات"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((fieldItem, index) => (
                      <TableRow key={fieldItem.id}>
                        {/* <TableCell className="py-1">
                          <FormField control={control} name={`costs.${index}.name`} render={({ field: f }) => (
                            <Input {...f} className="h-7 text-xs" placeholder={"اسم التكلفة"} />
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
                                dir={true}
                              >
                                 <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={"اختر التعريف"} /></SelectTrigger>
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
                              <Select value={f.value || ""} onValueChange={f.onChange} dir={true} disabled>
                                 <SelectTrigger className="h-7 text-xs bg-muted/50">
                                    <SelectValue placeholder={"نوع التكلفة"} />
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
                            <Input type="number" {...f} value={f.value || ''} className="h-7 text-xs text-center" placeholder={"المبلغ"} />
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
                  <PlusCircle className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1"/> {"إضافة تكلفة"}
                </Button>
              </div>
              <DialogFooter className="mt-auto pt-4">
                <DialogClose asChild><Button type="button" variant="outline">{"إغلاق"}</Button></DialogClose>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default ManageRequestedServiceCostsDialog;