// src/components/clinic/ManageServiceDepositsDialog.tsx
import React, { useEffect, useCallback, useMemo, useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import { PlusCircle, Trash2, Save, Info } from "lucide-react";

import type {
  RequestedService,
  RequestedServiceDeposit,
  RequestedServiceDepositFormData,
} from "@/types/services";

import { useAuth } from "@/contexts/AuthContext";
import { 
  createRequestedServiceDeposit, 
  updateRequestedServiceDeposit,
  deleteRequestedServiceDeposit, 
  getDepositsForRequestedService 
} from "@/services/requestedServiceDepositService";

// Form interfaces
interface DepositItemFormValues {
  id?: number;
  amount: string;
  is_bank: boolean;
  user_name?: string;
  created_at_formatted?: string;
}

interface ManageServiceDepositsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestedService: RequestedService;
  onAllDepositsUpdated?: () => void; // Callback after any CUD operation
}

interface ApiError {
  response?: { data?: { message?: string } };
}

const ManageServiceDepositsDialog: React.FC<ManageServiceDepositsDialogProps> = ({
  isOpen,
  onOpenChange,
  requestedService,
  onAllDepositsUpdated,
}) => {
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();
  
  const dateLocale = useMemo(() => 
    "ar".startsWith("ar") ? arSA : enUS,
    []
  );

  const depositsQueryKey = useMemo(() => 
    ["depositsForRequestedService", requestedService.id] as const,
    [requestedService.id]
  );

  const requestedServicesQueryKey = useMemo(() => 
    ["requestedServicesForVisit", requestedService.doctorvisits_id] as const,
    [requestedService.doctorvisits_id]
  );

  // State for managing deposits
  const [deposits, setDeposits] = useState<DepositItemFormValues[]>([]);

  // Query for deposits
  const { data: existingDeposits = [], isLoading: isLoadingDeposits } = useQuery<RequestedServiceDeposit[], Error>({
    queryKey: depositsQueryKey,
    queryFn: () => getDepositsForRequestedService(requestedService.id),
    enabled: isOpen && !!requestedService.id,
    gcTime: 0,
    refetchOnWindowFocus: false,
    // Prevent automatic refetching
    staleTime: Infinity,
    // Only refetch when explicitly invalidated
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Format deposits for form
  const formattedDeposits = useMemo(() => {
    if (!Array.isArray(existingDeposits)) return [];
    return existingDeposits.map(dep => ({
      id: dep.id,
      amount: String(dep.amount),
      is_bank: dep.is_bank,
      user_name: dep.user?.name || "غير معروف",
      created_at_formatted: dep.created_at
        ? format(new Date(dep.created_at), "Pp", { locale: dateLocale })
        : "-",
    }));
  }, [existingDeposits, dateLocale]);

  // Handle deposits state when dialog opens/closes or deposits change
  useEffect(() => {
    if (!isOpen) {
      setDeposits([]);
      return;
    }

    if (formattedDeposits.length > 0) {
      setDeposits(formattedDeposits);
    }
  }, [isOpen, formattedDeposits]);

  // Memoize the query invalidation function
  const handleQueryInvalidation = useCallback(() => {
    if (!isOpen) return;
    
    // Use a timeout to prevent immediate state updates
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: depositsQueryKey });
      queryClient.invalidateQueries({ queryKey: requestedServicesQueryKey });
      if (onAllDepositsUpdated) onAllDepositsUpdated();
    }, 0);
  }, [queryClient, depositsQueryKey, requestedServicesQueryKey, onAllDepositsUpdated, isOpen]);

  // Mutations
  const createMutation = useMutation<RequestedServiceDeposit, ApiError, Omit<RequestedServiceDepositFormData, "id">>({
    mutationFn: (data) => createRequestedServiceDeposit(requestedService.id, data),
    onSuccess: () => {
      toast.success("تم إضافة الدفعة بنجاح");
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || "فشل إنشاء الدفعة"),
  });

  const updateMutation = useMutation<RequestedServiceDeposit, ApiError, RequestedServiceDepositFormData>({
    mutationFn: (data) => updateRequestedServiceDeposit(data.id!, data),
    onSuccess: () => {
      toast.success("تم تحديث الدفعة بنجاح");
      handleQueryInvalidation();
    }
  });

  const deleteMutation = useMutation<void, ApiError, number>({
    mutationFn: (depositId) => deleteRequestedServiceDeposit(depositId),
    onSuccess: () => {
      toast.success("تم حذف الدفعة بنجاح");
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || "فشل في الحذف"),
  });

  const handleSaveRow = useCallback((index: number) => {
    if (!isOpen) return;

    const rowData = deposits[index];
    if (!rowData) return;

    // Basic validation
    if (!rowData.amount || parseFloat(rowData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    
    if (!currentClinicShift?.id && !rowData.id) {
      toast.error("لا توجد وردية نشطة للدفع");
      return;
    }

    const payload: RequestedServiceDepositFormData = {
      id: rowData.id || undefined,
      amount: rowData.amount,
      is_bank: rowData.is_bank,
    };

    if (rowData.id) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload as Omit<RequestedServiceDepositFormData, "id">);
    }
  }, [deposits, currentClinicShift?.id, updateMutation, createMutation, isOpen]);

  const addNewDepositField = useCallback(() => {
    if (!isOpen) return;

    const newDeposit: DepositItemFormValues = {
      amount: "0.00",
      is_bank: false,
      user_name: "إدخال جديد",
      created_at_formatted: format(new Date(), "Pp", { locale: dateLocale }),
    };

    setDeposits(prev => [...prev, newDeposit]);
  }, [dateLocale, isOpen]);

  const handleDelete = useCallback((deposit: DepositItemFormValues, index: number) => {
    if (!isOpen) return;

    if (deposit.id) {
      deleteMutation.mutate(Number(deposit.id));
    } else {
      setDeposits(prev => prev.filter((_, i) => i !== index));
    }
  }, [deleteMutation, isOpen]);

  const updateDeposit = useCallback((index: number, field: keyof DepositItemFormValues, value: string | boolean) => {
    setDeposits(prev => prev.map((deposit, i) => 
      i === index ? { ...deposit, [field]: value } : deposit
    ));
  }, []);

  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        إدارة دفعات الخدمة
      </DialogTitle>
      <DialogContent>
        {isLoadingDeposits ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {deposits.length === 0 && (
              <Box textAlign="center" py={4}>
                <Info size={24} className="mx-auto mb-2" />
                <Typography variant="body2" color="text.secondary">
                  لا توجد دفعات
                </Typography>
              </Box>
            )}
            {deposits.length > 0 && (
              <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ width: 120 }}>
                        المبلغ
                      </TableCell>
                      <TableCell align="center" sx={{ width: 100 }}>
                        طريقة الدفع
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        المستخدم
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        التاريخ والوقت
                      </TableCell>
                      <TableCell align="center" sx={{ width: 80 }}>
                        إجراءات
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deposits.map((deposit, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            type="number"
                            value={deposit.amount}
                            onChange={(e) => updateDeposit(index, 'amount', e.target.value)}
                            size="small"
                            inputProps={{ 
                              step: "0.01",
                              style: { textAlign: 'center', fontSize: '0.75rem' }
                            }}
                            sx={{ '& .MuiInputBase-root': { height: 32 } }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={deposit.is_bank}
                                onChange={(e) => updateDeposit(index, 'is_bank', e.target.checked)}
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="caption">
                                {deposit.is_bank ? "تحويل بنكي" : "نقدي"}
                              </Typography>
                            }
                            sx={{ margin: 0, justifyContent: 'center' }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Typography variant="caption">
                            {deposit.user_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Typography variant="caption">
                            {deposit.created_at_formatted}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="حفظ">
                            <IconButton
                              size="small"
                              onClick={() => handleSaveRow(index)}
                              disabled={
                                createMutation.isPending ||
                                updateMutation.isPending
                              }
                            >
                              {createMutation.isPending ||
                              updateMutation.isPending ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Save size={16} color="green" />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(deposit, index)}
                              disabled={
                                deleteMutation.isPending &&
                                deleteMutation.variables === Number(deposit.id)
                              }
                            >
                              {deleteMutation.isPending &&
                              deleteMutation.variables === Number(deposit.id) ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Trash2 size={16} color="error" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Box mt={2}>
              <Button
                variant="outlined"
                size="small"
                onClick={addNewDepositField}
                startIcon={<PlusCircle size={16} />}
              >
                إضافة دفعة
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
  );
};
export default ManageServiceDepositsDialog;
