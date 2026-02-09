// src/components/clinic/ManageRequestedServiceCostsDialog.tsx
import React, { useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
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
  id?: number; // RequestedServiceCost id when editing existing row
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
    queryFn: () => getServiceCostsForService(requestedService.service_id).then(res => res.data),
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

    // Prepare default rows if no existing costs

    reset({
      costs: existingReqServiceCosts.length > 0 
        ? existingReqServiceCosts.map(cost => ({
            id: cost.id,
            sub_service_cost_id: String(cost.sub_service_cost_id),
            service_cost_id: String(cost.service_cost_id),
            amount: String(cost.amount),
          }))
        : serviceCostDefinitions.map(def => ({
            sub_service_cost_id: String(def.sub_service_cost_id),
            service_cost_id: String(def.id),
            amount: String(calculateAmount(def).toFixed(2)),
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

    const calculatedAmount = calculateAmount(definition);
    setValue(`costs.${index}.amount`, calculatedAmount.toFixed(2));
    setValue(`costs.${index}.sub_service_cost_id`, String(definition.sub_service_cost_id));
  }, [serviceCostDefinitions, setValue, calculateAmount]);

  const saveOrUpdateMutation = useMutation<RequestedServiceCost, ApiError, RequestedServiceCostFormItemValues & { index: number }>({
    mutationFn: (data) => {
      const payload = {
          sub_service_cost_id: parseInt(data.sub_service_cost_id),
          service_cost_id: parseInt(data.service_cost_id),
          amount: parseFloat(data.amount),
      };
      const itemId = data.id != null ? data.id : undefined;
      return createOrUpdateRequestedServiceCost(requestedService.id, itemId, payload);
    },
    onSuccess: (_updatedItem, variables) => { 
      toast.success(variables.id != null ? "تم تحديث التكلفة بنجاح" : "تم إضافة التكلفة بنجاح");
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

  const getRowBackendId = (index: number): number | undefined => {
    const row = getValues(`costs.${index}`);
    return row?.id != null ? row.id : undefined;
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
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="md">
      <DialogTitle>{"إدارة تكاليف الخدمة"}</DialogTitle>
      <DialogContent dividers>
        {isLoadingExisting || isLoadingSubTypes || isLoadingDefinitions ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}><Loader2 className="h-8 w-8 animate-spin" /></Box>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ overflow: 'auto', maxHeight: '60vh' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 200 }}>نوع التكلفة</TableCell>
                    <TableCell sx={{ width: 180 }}>التعريف</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>المبلغ</TableCell>
                    <TableCell align="center" sx={{ width: 100 }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fields.map((fieldItem, index) => (
                    <TableRow key={fieldItem.id}>
                      <TableCell>
                        <Controller
                          control={control}
                          name={`costs.${index}.service_cost_id`}
                          render={({ field }) => (
                            <FormControl size="small" fullWidth>
                              <InputLabel id={`service-cost-${index}`}>اختر التعريف</InputLabel>
                              <Select
                                labelId={`service-cost-${index}`}
                                label="اختر التعريف"
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  handleDefinitionChange(index, String(e.target.value));
                                }}
                              >
                                {serviceCostDefinitions.map(def => (
                                  <MenuItem key={def.id} value={String(def.id)}>{def.name} ({def.sub_service_cost?.name || def.sub_service_cost_id})</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Controller
                          control={control}
                          name={`costs.${index}.sub_service_cost_id`}
                          render={({ field }) => (
                            <FormControl size="small" fullWidth>
                              <InputLabel id={`sub-service-cost-${index}`}>نوع التكلفة</InputLabel>
                              <Select labelId={`sub-service-cost-${index}`} label="نوع التكلفة" value={field.value || ''} onChange={field.onChange} disabled>
                                {subServiceCostTypes.map(type => (
                                  <MenuItem key={type.id} value={String(type.id)}>{type.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Controller
                          control={control}
                          name={`costs.${index}.amount`}
                          render={({ field }) => (
                            <TextField type="number" size="small" value={field.value || ''} onChange={field.onChange} placeholder="المبلغ" inputProps={{ inputMode: 'decimal' }} />
                          )}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button type="button" onClick={() => handleSaveRow(index)} disabled={saveOrUpdateMutation.isPending} size="small" variant="outlined" sx={{ mr: 1 }}>
                          {saveOrUpdateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button type="button" color="error" variant="outlined" size="small" onClick={() => { const backendId = getRowBackendId(index); backendId != null ? deleteReqServiceCostMutation.mutate(backendId) : remove(index); }} disabled={deleteReqServiceCostMutation.isPending && deleteReqServiceCostMutation.variables === getRowBackendId(index)}>
                          {deleteReqServiceCostMutation.isPending && deleteReqServiceCostMutation.variables === Number(fieldItem.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box mt={2} display="flex" justifyContent="flex-start">
              <Button type="button" variant="outlined" size="small" onClick={addNewCostField}>
                <PlusCircle className="h-4 w-4" style={{ marginInlineEnd: 6 }} /> {"إضافة تكلفة"}
              </Button>
            </Box>
          </form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} variant="outlined">إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};
export default ManageRequestedServiceCostsDialog;