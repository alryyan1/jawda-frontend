// src/components/clinic/ManageServiceDepositsDialog.tsx
import React, { useEffect, useCallback, useMemo, useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
import dayjs from "dayjs";
import { useAuthorization } from "@/hooks/useAuthorization";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

// Form interfaces
interface DepositItemFormValues {
  id?: number;
  amount: string;
  payment_method_id: number;
  payment_method_name?: string;
  user_name?: string;
  created_at?: string;
  user_id: number;
  requested_service: RequestedService;
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
  const { paymentMethods, defaultPaymentMethodId } = usePaymentMethods();

  const depositsQueryKey = useMemo(() => 
    ["depositsForRequestedService", requestedService.id] as const,
    [requestedService.id]
  );

  const requestedServicesQueryKey = useMemo(() => 
    ["requestedServicesForVisit", requestedService.doctorvisits_id] as const,
    [requestedService.doctorvisits_id]
  );
 const {user} = useAuth();
  // State for managing deposits
  const [deposits, setDeposits] = useState<DepositItemFormValues[]>([]);
  // State for add deposit dialog
  const [isAddDepositDialogOpen, setIsAddDepositDialogOpen] = useState(false);
  const [newDepositAmount, setNewDepositAmount] = useState("");
  const [newDepositPaymentMethodId, setNewDepositPaymentMethodId] = useState<number | "">("");
  const {can, hasRole} = useAuthorization();
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
      user_id: dep.user_id,
      requested_service: dep.requested_service,
      id: dep.id,
      amount: String(dep.amount),
      payment_method_id: dep.payment_method_id ?? defaultPaymentMethodId ?? 0,
      payment_method_name: dep.payment_method?.name,
      user_name: dep.user?.name || "غير معروف",
      created_at: dep.created_at

    }));
  }, [existingDeposits, defaultPaymentMethodId]);

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
      setIsAddDepositDialogOpen(false);
      setNewDepositAmount("");
      setNewDepositPaymentMethodId("");
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

  const deleteMutation = useMutation<void, ApiError, DepositItemFormValues>({
    mutationFn: (deposit) => deleteRequestedServiceDeposit(deposit.id!),
    onSuccess: () => {
      toast.success("تم حذف الدفعة بنجاح");
      handleQueryInvalidation();
    },
    onError: (err) => toast.error(err.response?.data?.message || "فشل في الحذف"),
  });

  const handleSaveRow = useCallback((index: number) => {
    if (!isOpen) return;

    const rowData = deposits[index];
    if (!rowData || !rowData.id) return; // Only allow updating existing deposits

    // Basic validation
    if (!rowData.amount || parseFloat(rowData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    const payload: RequestedServiceDepositFormData = {
      id: rowData.id,
      amount: rowData.amount,
      payment_method_id: rowData.payment_method_id,
    };

    updateMutation.mutate(payload);
  }, [deposits, updateMutation, isOpen]);

  const handleOpenAddDepositDialog = useCallback(() => {
    if (!isOpen) return;
    setNewDepositPaymentMethodId(defaultPaymentMethodId ?? "");
    setIsAddDepositDialogOpen(true);
  }, [isOpen, defaultPaymentMethodId]);

  const handleSubmitAddDeposit = useCallback(() => {
    // Validation
    if (!newDepositAmount || parseFloat(newDepositAmount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (!currentClinicShift?.id) {
      toast.error("لا توجد وردية نشطة للدفع");
      return;
    }

    if (!newDepositPaymentMethodId) {
      toast.error("يرجى اختيار طريقة الدفع");
      return;
    }

    const payload: Omit<RequestedServiceDepositFormData, "id"> = {
      amount: newDepositAmount,
      payment_method_id: newDepositPaymentMethodId,
    };

    createMutation.mutate(payload);
  }, [newDepositAmount, newDepositPaymentMethodId, currentClinicShift?.id, createMutation]);

  const handleDelete = useCallback((deposit: DepositItemFormValues) => {
    if (!isOpen) return;

    if (deposit.id) {
      deleteMutation.mutate(deposit);
    }
  }, [deleteMutation, isOpen]);

  const updateDeposit = useCallback((index: number, field: keyof DepositItemFormValues, value: string | number) => {
    setDeposits(prev => prev.map((deposit, i) => 
      i === index ? { ...deposit, [field]: value } : deposit
    ));
  }, []);

  if (!isOpen) return null;

  console.log('deposits', deposits,user,'user');
  return (
    <>
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
              <Box display="flex" justifyContent="center">
                <TableContainer component={Paper} elevation={1} sx={{ maxWidth: '100%' }}>
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={{ width: 120, fontSize: '1.1rem', fontWeight: 700 }}>
                          المبلغ
                        </TableCell>
                        <TableCell align="center" sx={{ width: 100, fontSize: '1.1rem', fontWeight: 700 }}>
                           الدفع
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1.1rem', fontWeight: 700 }}>
                          المستخدم
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1.1rem', fontWeight: 700 }}>
                          التاريخ والوقت
                        </TableCell>
                        <TableCell align="center" sx={{ width: 80, fontSize: '1.1rem', fontWeight: 700 }}>
                          إجراءات
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deposits.map((deposit, index) => (
                        <TableRow key={index}>
                          <TableCell align="center" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              {deposit.amount}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Select
                              value={deposit.payment_method_id || ""}
                              onChange={(e) => updateDeposit(index, 'payment_method_id', Number(e.target.value))}
                              size="small"
                              sx={{ minWidth: 100, fontSize: '1rem', fontWeight: 600 }}
                            >
                              {paymentMethods.map((method) => (
                                <MenuItem key={method.id} value={method.id}>
                                  {method.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 600 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              {deposit.user_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: '1rem', fontWeight: 600 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              {dayjs(deposit.created_at).format("DD/MM/YYYY HH:mm")}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {deposit.id && (
                              <>
                                <Tooltip title="تعديل">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleSaveRow(index)}
                                    disabled={updateMutation.isPending}
                                  >
                                    {updateMutation.isPending ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <Save size={16} color="green" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                                  <IconButton
                                    onClick={() => handleDelete(deposit)}
                                    disabled={
                                   !hasRole('admin') && (!can('الغاء سداد خدمه') || deposit.requested_service?.user_deposited !== user?.id)
                                    }
                                  >
                                    {deleteMutation.isPending &&
                                    deleteMutation.variables?.id === deposit.id ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <Trash2 size={16} color="red" className={!can('الغاء سداد خدمه') ? 'cursor-not-allowed' : ''} />
                                    )}
                                  </IconButton>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            <Box mt={2}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenAddDepositDialog}
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

    {/* Add Deposit Dialog */}
    <Dialog 
      open={isAddDepositDialogOpen} 
      onClose={() => {
        setIsAddDepositDialogOpen(false);
        setNewDepositAmount("");
        setNewDepositPaymentMethodId("");
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        إضافة دفعة جديدة
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <TextField
            label="المبلغ"
            type="number"
            value={newDepositAmount}
            onChange={(e) => setNewDepositAmount(e.target.value)}
            fullWidth
            required
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ fontSize: '1.1rem' }}
            InputLabelProps={{ sx: { fontSize: '1rem' } }}
            InputProps={{ sx: { fontSize: '1rem', fontWeight: 600 } }}
          />
          <FormControl fullWidth>
            <InputLabel id="new-deposit-payment-method-label">طريقة الدفع</InputLabel>
            <Select
              labelId="new-deposit-payment-method-label"
              label="طريقة الدفع"
              value={newDepositPaymentMethodId}
              onChange={(e) => setNewDepositPaymentMethodId(Number(e.target.value))}
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method.id} value={method.id}>
                  {method.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setIsAddDepositDialogOpen(false);
            setNewDepositAmount("");
            setNewDepositPaymentMethodId("");
          }}
          variant="outlined"
        >
          إلغاء
        </Button>
        <Button 
          onClick={handleSubmitAddDeposit}
          variant="contained"
          disabled={createMutation.isPending}
          startIcon={createMutation.isPending ? <CircularProgress size={16} /> : null}
        >
          {createMutation.isPending ? "جاري الإضافة..." : "إضافة"}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};
export default ManageServiceDepositsDialog;
