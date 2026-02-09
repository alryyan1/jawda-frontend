// src/components/services/ManageServiceCostsDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Save as SaveIcon, Delete as DeleteIcon } from '@mui/icons-material';

import type { Service, ServiceCost, SubServiceCost } from '@/types/services';
import type { ServiceCostsResponse } from '@/services/serviceCostService';
import { getSubServiceCostsList } from '@/services/subServiceCostService';
import {
  deleteServiceCost,
  createServiceCost,
  getServiceCostsForService,
  updateServiceCost,
} from '@/services/serviceCostService';
import AddSubServiceCostDialog from './AddSubServiceCostDialog';

// Zod schema for a single service cost item (Arabic messages)
const serviceCostItemSchema = z
  .object({
    id: z.number().optional().nullable(),
    sub_service_cost_id: z.string().min(1, 'يجب اختيار نوع التكلفة.'),
    cost_type: z.enum(['total', 'after cost'], { required_error: 'يجب اختيار أساس التكلفة.' }),
    percentage: z
      .string()
      .refine(
        (val) =>
          val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100),
        { message: '0-100 أو فارغ' }
      )
      .optional()
      .nullable(),
    fixed: z
      .string()
      .refine((val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
        message: 'قيمة موجبة أو فارغ',
      })
      .optional()
      .nullable(),
  })
  .refine(
    (data) => (data.percentage && data.percentage !== '') || (data.fixed && data.fixed !== ''),
    { message: 'يجب إدخال النسبة المئوية أو المبلغ الثابت.', path: ['percentage'] }
  );

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
  isOpen,
  onOpenChange,
  service,
  onCostsUpdated,
}) => {
  const queryClient = useQueryClient();
  const [isAddSubTypeDialogOpen, setIsAddSubTypeDialogOpen] = useState(false);
  const [focusedRowIndexForSubTypeAdd, setFocusedRowIndexForSubTypeAdd] = useState<number | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  const serviceCostsQueryKey = React.useMemo(() => ['serviceCostsForService', service.id] as const, [service.id]);
  const subServiceCostsQueryKey = React.useMemo(() => ['subServiceCostsList'] as const, []);

  const { data: response, isLoading: isLoadingExistingCosts } = useQuery<ServiceCostsResponse, Error>({
    queryKey: serviceCostsQueryKey,
    queryFn: () => getServiceCostsForService(service.id),
    enabled: isOpen && !!service.id,
  });

  const existingServiceCosts = response?.data || [];

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

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'costs',
    keyName: 'fieldId',
  });

  useEffect(() => {
    if (isOpen && existingServiceCosts && existingServiceCosts.length > 0 && !isInitialized) {
      const formattedCosts = existingServiceCosts.map((sc) => ({
        id: sc.id,
        sub_service_cost_id: String(sc.sub_service_cost_id),
        cost_type: sc.cost_type,
        percentage: sc.percentage !== null ? String(sc.percentage) : '',
        fixed: sc.fixed !== null ? String(sc.fixed) : '',
      }));
      replace(formattedCosts);
      setIsInitialized(true);
    }
  }, [isOpen, existingServiceCosts, replace, isInitialized]);

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
      const selectedSubServiceCost = subServiceCostTypes.find(
        (type) => type.id === parseInt(data.sub_service_cost_id)
      );
      if (!selectedSubServiceCost) {
        throw new Error('نوع التكلفة المحدد غير موجود');
      }
      const payload = {
        name: selectedSubServiceCost.name,
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        fixed: data.fixed ? parseFloat(data.fixed) : null,
        sub_service_cost_id: parseInt(data.sub_service_cost_id),
        cost_type: data.cost_type,
      };
      return createServiceCost(service.id, payload);
    },
    onSuccess: () => {
      toast.success('تمت إضافة تكلفة الخدمة بنجاح');
      queryClient.invalidateQueries({ queryKey: serviceCostsQueryKey });
      if (onCostsUpdated) onCostsUpdated();
    },
    onError: (err: ApiError) => toast.error(err.response?.data?.message || 'فشل في الإضافة'),
  });

  const updateMutation = useMutation<ServiceCost, ApiError, ServiceCostFormItemValues>({
    mutationFn: (data: ServiceCostFormItemValues) => {
      const selectedSubServiceCost = subServiceCostTypes.find(
        (type) => type.id === parseInt(data.sub_service_cost_id)
      );
      if (!selectedSubServiceCost) {
        throw new Error('نوع التكلفة المحدد غير موجود');
      }
      const payload = {
        name: selectedSubServiceCost.name,
        sub_service_cost_id: parseInt(data.sub_service_cost_id),
        cost_type: data.cost_type,
        percentage: data.percentage ? parseFloat(data.percentage) : null,
        fixed: data.fixed ? parseFloat(data.fixed) : null,
      };
      return updateServiceCost(data.id!, payload);
    },
    onSuccess: () => {
      toast.success('تم تحديث تكلفة الخدمة بنجاح');
      queryClient.invalidateQueries({ queryKey: serviceCostsQueryKey });
      if (onCostsUpdated) onCostsUpdated();
    },
    onError: (err: ApiError) => toast.error(err.response?.data?.message || 'فشل في التحديث'),
  });

  const deleteMutation = useMutation<void, ApiError, number>({
    mutationFn: (serviceCostId: number) => deleteServiceCost(serviceCostId),
    onSuccess: () => {
      toast.success('تم الحذف بنجاح');
      queryClient.invalidateQueries({ queryKey: serviceCostsQueryKey });
      if (onCostsUpdated) onCostsUpdated();
    },
    onError: (err: ApiError) => toast.error(err.response?.data?.message || 'فشل في الحذف'),
  });

  const onSubmit = useCallback(() => {
    toast.info('احفظ كل صف بالضغط على أيقونة الحفظ بجانبه.');
  }, []);

  const handleSaveRow = useCallback(
    (index: number) => {
      form.trigger(`costs.${index}`).then((isValid) => {
        if (isValid) {
          const rowData = getValues(`costs.${index}`);
          if (rowData.id) {
            updateMutation.mutate(rowData);
          } else {
            createMutation.mutate(rowData);
          }
        } else {
          toast.error('يرجى تصحيح الأخطاء في الصف');
        }
      });
    },
    [form, getValues, updateMutation, createMutation]
  );

  const handleSubServiceCostTypeAdded = useCallback(
    async (newSubType: SubServiceCost) => {
      if (focusedRowIndexForSubTypeAdd !== undefined) {
        setValue(`costs.${focusedRowIndexForSubTypeAdd}.sub_service_cost_id`, String(newSubType.id), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
      toast.success(`تمت إضافة "${newSubType.name}" إلى القائمة`);
      setIsAddSubTypeDialogOpen(false);
      setFocusedRowIndexForSubTypeAdd(undefined);
      await queryClient.invalidateQueries({ queryKey: subServiceCostsQueryKey });
    },
    [setValue, queryClient, subServiceCostsQueryKey, focusedRowIndexForSubTypeAdd]
  );

  const addNewCostField = useCallback(() => {
    append(
      {
        sub_service_cost_id: '',
        cost_type: 'total',
        percentage: '',
        fixed: '',
      },
      { shouldFocus: false }
    );
  }, [append]);

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onClose={() => onOpenChange(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '85vh' } }}>
        <DialogTitle>إدارة تكاليف الخدمة: {service.name || ''}</DialogTitle>
        <DialogContent dividers>
          {isLoadingExistingCosts || isLoadingSubTypes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '50vh', minWidth: 700 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ minWidth: 200 }}>نوع التكلفة</TableCell>
                      <TableCell align="center" sx={{ minWidth: 130 }}>الأساس</TableCell>
                      <TableCell align="center" sx={{ minWidth: 100 }}>النسبة %</TableCell>
                      <TableCell align="center" sx={{ minWidth: 100 }}>المبلغ الثابت</TableCell>
                      <TableCell align="center" sx={{ width: 120 }}>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((fieldItem, index) => (
                      <TableRow key={fieldItem.fieldId}>
                        <TableCell sx={{ py: 0.5 }} align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Controller
                              control={control}
                              name={`costs.${index}.sub_service_cost_id`}
                              render={({ field: f }) => (
                                <FormControl size="small" fullWidth sx={{ minWidth: 160 }}>
                                  <InputLabel>اختر النوع</InputLabel>
                                  <Select
                                    value={f.value || ''}
                                    onChange={f.onChange}
                                    label="اختر النوع"
                                    disabled={isLoadingSubTypes}
                                  >
                                    {subServiceCostTypes.map((type) => (
                                      <MenuItem key={type.id} value={String(type.id)}>
                                        {type.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            />
                            <IconButton
                              size="small"
                              onClick={() => {
                                setFocusedRowIndexForSubTypeAdd(index);
                                setIsAddSubTypeDialogOpen(true);
                              }}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }} align="center">
                          <Controller
                            control={control}
                            name={`costs.${index}.cost_type`}
                            render={({ field: f }) => (
                              <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                                <Select value={f.value || 'total'} onChange={f.onChange}>
                                  <MenuItem value="total">من الإجمالي</MenuItem>
                                  <MenuItem value="after cost">بعد التكلفة</MenuItem>
                                </Select>
                              </FormControl>
                            )}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }} align="center">
                          <Controller
                            control={control}
                            name={`costs.${index}.percentage`}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                type="number"
                                size="small"
                                placeholder="%"
                                sx={{ width: 90 }}
                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }} align="center">
                          <Controller
                            control={control}
                            name={`costs.${index}.fixed`}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                type="number"
                                size="small"
                                sx={{ width: 90 }}
                                inputProps={{ min: 0, step: 0.01 }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }} align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleSaveRow(index)}
                              disabled={createMutation.isPending || updateMutation.isPending}
                              color="primary"
                              title="حفظ"
                            >
                              {(createMutation.isPending && !fieldItem.id) ||
                              (updateMutation.isPending && updateMutation.variables?.id === fieldItem.id) ? (
                                <CircularProgress size={20} />
                              ) : (
                                <SaveIcon fontSize="small" sx={{ color: 'success.main' }} />
                              )}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() =>
                                fieldItem.id ? deleteMutation.mutate(Number(fieldItem.id)) : remove(index)
                              }
                              disabled={deleteMutation.isPending && deleteMutation.variables === Number(fieldItem.id)}
                              color="error"
                              title="حذف"
                            >
                              {deleteMutation.isPending && deleteMutation.variables === Number(fieldItem.id) ? (
                                <CircularProgress size={20} />
                              ) : (
                                <DeleteIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ pt: 2 }}>
                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addNewCostField}>
                  إضافة بند تكلفة
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onOpenChange(false)} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
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
