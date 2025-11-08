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
  TextField,
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

// Form interfaces
interface DepositItemFormValues {
  id?: number;
  amount: string;
  is_bank: boolean;
  user_name?: string;
  created_at?: string;
  user_id: number;
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
  const [newDepositIsBank, setNewDepositIsBank] = useState(false);
  const {can} = useAuthorization();
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
      created_at: dep.created_at
      
    }));
  }, [existingDeposits]);

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
      setNewDepositIsBank(false);
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
    if (!rowData || !rowData.id) return; // Only allow updating existing deposits

    // Basic validation
    if (!rowData.amount || parseFloat(rowData.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    const payload: RequestedServiceDepositFormData = {
      id: rowData.id,
      amount: rowData.amount,
      is_bank: rowData.is_bank,
    };

    updateMutation.mutate(payload);
  }, [deposits, updateMutation, isOpen]);

  const handleOpenAddDepositDialog = useCallback(() => {
    if (!isOpen) return;
    setIsAddDepositDialogOpen(true);
  }, [isOpen]);

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

    const payload: Omit<RequestedServiceDepositFormData, "id"> = {
      amount: newDepositAmount,
      is_bank: newDepositIsBank,
    };

    createMutation.mutate(payload);
  }, [newDepositAmount, newDepositIsBank, currentClinicShift?.id, createMutation]);

  const handleDelete = useCallback((deposit: DepositItemFormValues) => {
    if (!isOpen) return;

    if (deposit.id) {
      deleteMutation.mutate(Number(deposit.id));
    }
  }, [deleteMutation, isOpen]);

  const updateDeposit = useCallback((index: number, field: keyof DepositItemFormValues, value: string | boolean) => {
    setDeposits(prev => prev.map((deposit, i) => 
      i === index ? { ...deposit, [field]: value } : deposit
    ));
  }, []);

  if (!isOpen) return null;

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
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={deposit.is_bank}
                                  onChange={(e) => updateDeposit(index, 'is_bank', e.target.checked)}
                                  size="small"
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                                  {deposit.is_bank ? "بنكك" : "كاش"}
                                </Typography>
                              }
                              sx={{ margin: 0, justifyContent: 'center' }}
                            />
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
                                      deleteMutation.isPending &&
                                      deleteMutation.variables === Number(deposit.id) || !can('الغاء سداد خدمه') || deposit.user_id !== user?.id
                                    }
                                  >
                                    {deleteMutation.isPending &&
                                    deleteMutation.variables === Number(deposit.id) ? (
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
        setNewDepositIsBank(false);
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
          <FormControlLabel
            control={
              <Checkbox
                checked={newDepositIsBank}
                onChange={(e) => setNewDepositIsBank(e.target.checked)}
              />
            }
            label={
              <Typography variant="body1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                {newDepositIsBank ? "بنك" : "كاش"}
              </Typography>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => {
            setIsAddDepositDialogOpen(false);
            setNewDepositAmount("");
            setNewDepositIsBank(false);
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
