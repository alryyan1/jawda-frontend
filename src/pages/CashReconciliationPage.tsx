import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// MUI
import { Box, Card, CardContent, CardHeader, Typography, FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Autocomplete } from '@mui/material';
import { PictureAsPdf as PdfIcon, Delete as DeleteIcon } from '@mui/icons-material';

import { formatNumber } from '@/lib/utils';
import { getDenominationsForShift, saveDenominationCounts } from '@/services/cashReconciliationService';
import { deleteCost } from '@/services/costService';
import type { Denomination } from '@/types/cash';
import { getShiftsList } from '@/services/shiftService';
import type { Shift } from '@/types/shifts';
import UserMoneySummary from '@/components/UserMoneySummary';
import apiClient from '@/services/api';
import { webUrl } from '@/pages/constants';
import { getUsers } from '@/services/userService';
import type { User } from '@/types/users';

// Cost interface
interface Cost {
  id: number;
  description: string;
  amount: number; // Cash portion
  amount_bankak: number; // Bank portion
  created_at: string;
  user_cost_name?: string;
  comment?: string;
}

const CashReconciliationPage: React.FC = () => {
    const { currentClinicShift } = useAuth();
    const queryClient = useQueryClient();
    const { user } = useAuth();
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(currentClinicShift?.id.toString() || null);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  
  // Cost creation form state
  const [costForm, setCostForm] = useState({
    description: '',
    amount_cash: '',
    amount_bank: ''
  });

  // Fetch all shifts for the dropdown
  const { data: shiftsList, isLoading: isLoadingShifts } = useQuery<Shift[], Error>({
    queryKey: ['allShiftsForReconciliation'],
    queryFn: () => getShiftsList({per_page: 0}),
  });

  // Fetch all users for the autocomplete
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsersForReconciliation'],
    queryFn: () => getUsers(1, { per_page: 0 }),
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const hasInitializedUser = useRef(false);

  const usersList = useMemo(() => usersData?.data || [], [usersData?.data]);

  // Set default selected user to current logged in user
  useEffect(() => {
    if (user?.id && usersList.length > 0 && !hasInitializedUser.current) {
      const currentUserInList = usersList.find(u => u.id === user.id);
      if (currentUserInList) {
        setSelectedUser(currentUserInList);
        hasInitializedUser.current = true;
      }
    }
  }, [user, usersList]);

  // Fetch denominations for the selected shift
  const { data: fetchedDenominations, isLoading: isLoadingDenominations } = useQuery<Denomination[], Error>({
    queryKey: ['denominationsForShift', selectedShiftId],
    queryFn: () => getDenominationsForShift(Number(selectedShiftId)),
    enabled: !!selectedShiftId,
  });

  // Update denominations when fetched data changes
  useEffect(() => {
    if (fetchedDenominations) {
      setDenominations(fetchedDenominations);
    }
  }, [fetchedDenominations]);

  // Fetch costs for the selected shift
  const { data: costsData, isLoading: isLoadingCosts } = useQuery<{ data: Cost[] }, Error>({
    queryKey: ['shiftCosts', selectedShiftId],
    queryFn: async () => {
      const response = await apiClient.get(`/costs-report-data?shift_id=${selectedShiftId}&user_cost_id=${user?.id}`);
      return response.data;
    },
    enabled: !!selectedShiftId,
  });

  const costs = costsData?.data || [];

  // Calculate total costs
  const totalCosts = useMemo(() => {
    return costs.reduce((total, cost) => total + cost.amount + cost.amount_bankak, 0);
  }, [costs]);

  const saveMutation = useMutation({
    mutationFn: (data: { shiftId: number; counts: Denomination[] }) =>
      saveDenominationCounts(data.shiftId, data.counts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['denominationsForShift', selectedShiftId] });
    },
    onError: () => toast.error('فشل الحفظ')
  });

  // Cost creation mutation
  const createCostMutation = useMutation({
    mutationFn: async (costData: { description: string; amount_cash_input: number; amount_bank_input: number; shift_id: number }) => {
      const response = await apiClient.post('/costs', costData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('تم إضافة المصروف بنجاح');
      setCostForm({ description: '', amount_cash: '', amount_bank: '' });
      // Invalidate income summary and costs to refresh the data
      queryClient.invalidateQueries({ queryKey: ['userIncomeSummary', selectedShiftId] });
      queryClient.invalidateQueries({ queryKey: ['shiftCosts', selectedShiftId] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'فشل في إضافة المصروف';
      toast.error(errorMessage);
    }
  });

  // Cost deletion mutation
  const deleteCostMutation = useMutation({
    mutationFn: (costId: number) => deleteCost(costId),
    onSuccess: () => {
      toast.success('تم حذف المصروف بنجاح');
      // Invalidate costs to refresh the data
      queryClient.invalidateQueries({ queryKey: ['shiftCosts', selectedShiftId] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'فشل في حذف المصروف';
      toast.error(errorMessage);
    }
  });

  const handleCountKeyPress = (id: number, count: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const newCount = parseInt(count, 10);
      if (!isNaN(newCount) && newCount >= 0) {
        setDenominations(prev => {
          const updatedDenominations = prev.map(deno => 
            deno.id === id ? { ...deno, count: deno.count + newCount } : deno
          );
          if (selectedShiftId) {
            saveMutation.mutate({ 
              shiftId: Number(selectedShiftId), 
              counts: updatedDenominations 
            });
          }
          return updatedDenominations;
        });
        (event.currentTarget as HTMLInputElement).value = '';
      }
    }
  };

  const handleSumChange = (id: number, newSum: string) => {
    const newCount = parseInt(newSum, 10);
    if (!isNaN(newCount) && newCount >= 0) {
      setDenominations(prev => {
        const updatedDenominations = prev.map(deno => 
          deno.id === id ? { ...deno, count: newCount } : deno
        );
        if (selectedShiftId) {
          saveMutation.mutate({ 
            shiftId: Number(selectedShiftId), 
            counts: updatedDenominations 
          });
        }
        return updatedDenominations;
      });
    }
  };

  const totalCalculated = useMemo(() => {
    return denominations.reduce((acc, deno) => acc + deno.name * deno.count, 0);
  }, [denominations]);

  // Handle clear denominations
  const handleClearDenominations = () => {
    setDenominations(prev => prev.map(deno => ({ ...deno, count: 0 })));
  };

  // Handle PDF generation
  const handleGeneratePdf = async () => {
    if (!selectedShiftId) {
      toast.error('يرجى اختيار وردية أولاً');
      return;
    }

    if (!selectedUser) {
      toast.error('يرجى اختيار مستخدم أولاً');
      return;
    }

    try {
      // Create URL for web route that opens PDF in new tab
      const pdfUrl = `${webUrl}reports/cash-reconciliation/pdf?shift_id=${selectedShiftId}&user_id=${selectedUser.id}`;

      // Open PDF in new tab
      window.open(pdfUrl, '_blank');

      toast.success('تم فتح التقرير في تبويب جديد');
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast.error('فشل في إنشاء التقرير');
    }
  };

  // Handle cost form submission
  const handleCreateCost = () => {
    if (!costForm.description.trim()) {
      toast.error('يرجى إدخال وصف المصروف');
      return;
    }

    const cashAmount = costForm.amount_cash.trim() ? parseFloat(costForm.amount_cash) : 0;
    const bankAmount = costForm.amount_bank.trim() ? parseFloat(costForm.amount_bank) : 0;

    if (isNaN(cashAmount) || isNaN(bankAmount)) {
      toast.error('يرجى إدخال مبالغ صحيحة');
      return;
    }

    if (cashAmount < 0 || bankAmount < 0) {
      toast.error('يرجى إدخال مبالغ صحيحة');
      return;
    }

    if (cashAmount === 0 && bankAmount === 0) {
      toast.error('يرجى إدخال مبلغ نقدي أو بنكي');
      return;
    }

    if (!selectedShiftId) {
      toast.error('يرجى اختيار وردية');
      return;
    }

    // Build the request data - always include both fields, but with 0 if not provided
    const costData = {
      description: costForm.description,
      amount_cash_input: cashAmount,
      amount_bank_input: bankAmount,
      shift_id: Number(selectedShiftId)
    };

    createCostMutation.mutate(costData);
  };
  
  const isLoading = isLoadingShifts || (!!selectedShiftId && isLoadingDenominations);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 1 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>الفئات </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ maxWidth: 360, flex: 1, minWidth: 200 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="shift-select-label">اختر الوردية</InputLabel>
            <Select
              labelId="shift-select-label"
              label="اختر الوردية"
              value={selectedShiftId || ''}
              onChange={(e) => setSelectedShiftId(String(e.target.value))}
              disabled={isLoadingShifts}
            >
              {(shiftsList || []).map(s => (
                <MenuItem key={s.id} value={s.id.toString()}>
                  {s.name || `وردية #${s.id} (${new Date(s.created_at).toLocaleDateString('ar-SA')})`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* User Autocomplete */}
        <Box sx={{ maxWidth: 360, flex: 1, minWidth: 200 }}>
          <Autocomplete
            options={usersList}
            getOptionLabel={(option) => option.name || ''}
            value={selectedUser}
            onChange={(_, newValue) => setSelectedUser(newValue)}
            loading={isLoadingUsers}
            size="small"
            renderInput={(params) => (
              <TextField
                {...params}
                label="اختر المستخدم"
                placeholder="ابحث عن مستخدم..."
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                {option.name}
              </Box>
            )}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
          />
        </Box>
        
        {/* PDF Generation Button */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<PdfIcon />}
          onClick={handleGeneratePdf}
          disabled={!selectedShiftId || !selectedUser || isLoading}
          sx={{ minWidth: 160 }}
        >
          إنشاء تقرير PDF
        </Button>
        <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleClearDenominations}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    مسح الكل
                  </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
          <CircularProgress />
        </Box>
      ) : !selectedShiftId ? (
        <Card sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>يرجى اختيار وردية</Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 ,overflow:'auto' ,height:window.innerHeight - 200 }}>
          {/* Left Column: Calculator and Summary */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Denomination Calculator */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {/* Headers */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 1, px: 1, fontWeight: 600, fontSize: 10, color: 'text.secondary' }}>
                    <Box textAlign="center">الفئة</Box>
                    <Box textAlign="center">الإضافة</Box>
                    <Box textAlign="center">الإجمالي الحالي</Box>
                    <Box textAlign="center">المجموع</Box>
                  </Box>
                  {/* Denomination Rows */}
                  {denominations.map(deno => (
                    <Box key={deno.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, alignItems: 'center' }}>
                      <Box sx={{ p: 1, bgcolor: 'primary.light', color: 'primary.contrastText', textAlign: 'center', borderRadius: 1, fontWeight: 700 }}>
                        {deno.name}
                      </Box>
                      <TextField
                        type="number"
                        defaultValue=""
                        onKeyPress={e => handleCountKeyPress(deno.id, (e.target as HTMLInputElement).value, e as React.KeyboardEvent<HTMLInputElement>)}
                        placeholder="  "
                        size="small"
                        inputProps={{ min: 0 }}
                      />
                      <TextField 
                        value={deno.count} 
                        onChange={(e) => handleSumChange(deno.id, e.target.value)}
                        onBlur={(e) => handleSumChange(deno.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSumChange(deno.id, (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        size="small"
                        inputProps={{ min: 0 }}
                      />
                      <TextField value={formatNumber(deno.name * deno.count, 0)} size="small" InputProps={{ readOnly: true }} />
                    </Box>
                  ))}
                </Box>
                
                {/* Clear Button */}
            
              </CardContent>
            </Card>
            
            {/* Financial Summary - Below the calculator */}
            <UserMoneySummary
              userId={user?.id}
              shiftId={Number(selectedShiftId)}
              totalDenominations={totalCalculated}
            />
          </Box>

          {/* Right Column: Quick Cost Creation */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card>
              <CardHeader title="إضافة مصروف " />
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label="وصف المصروف"
                    value={costForm.description}
                    onChange={(e) => setCostForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="مثال: شراء مستلزمات، صيانة، إلخ"
                    fullWidth
                    size="small"
                  />
                  
                  <TextField
                    label="المبلغ النقدي"
                    type="number"
                    value={costForm.amount_cash}
                    onChange={(e) => setCostForm(prev => ({ ...prev, amount_cash: e.target.value }))}
                    placeholder="0.00"
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  
                  <TextField
                    label="المبلغ البنكي"
                    type="number"
                    value={costForm.amount_bank}
                    onChange={(e) => setCostForm(prev => ({ ...prev, amount_bank: e.target.value }))}
                    placeholder="0.00"
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  
                  <Button
                    variant="contained"
                    onClick={handleCreateCost}
                    disabled={createCostMutation.isPending || !selectedShiftId}
                    fullWidth
                    startIcon={createCostMutation.isPending ? <CircularProgress size={20} /> : null}
                  >
                    {createCostMutation.isPending ? 'جاري الإضافة...' : 'إضافة المصروف'}
                  </Button>
                  
                  {!selectedShiftId && (
                    <Typography variant="caption" color="error" textAlign="center">
                      يرجى اختيار وردية أولاً
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Costs Table */}
            <Card>
              {/* <CardHeader title="المصروفات المسجلة" /> */}
              <CardContent>
                {isLoadingCosts ? (
                  <Box display="flex" justifyContent="center" p={1}>
                    <CircularProgress />
                  </Box>
                ) : costs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" p={1}>
                    لا توجد مصروفات مسجلة لهذه الوردية
                  </Typography>
                ) : (
                  <>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>الوصف</TableCell>
                            <TableCell align="center">النقدي</TableCell>
                            <TableCell align="center">البنكي</TableCell>
                            <TableCell align="center">المجموع</TableCell>
                            {/* <TableCell align="center">التاريخ</TableCell> */}
                            <TableCell align="center">الإجراءات</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {costs.map((cost) => (
                            <TableRow key={cost.id}>
                              <TableCell>
                                <Typography variant="body2">
                                  {cost.description}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                {cost.amount > 0 ? (
                                  <Chip 
                                    label={formatNumber(cost.amount)} 
                                    color="success" 
                                    size="small" 
                                    variant="outlined"
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {cost.amount_bankak > 0 ? (
                                  <Chip 
                                    label={formatNumber(cost.amount_bankak)} 
                                    color="info" 
                                    size="small" 
                                    variant="outlined"
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight="bold">
                                  {formatNumber(cost.amount + cost.amount_bankak)}
                                </Typography>
                              </TableCell>
                          
                              <TableCell align="center">
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => deleteCostMutation.mutate(cost.id)}
                                  disabled={deleteCostMutation.isPending}
                                >
                                  حذف
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* Total Cost Display */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="h6" textAlign="center" color="primary.contrastText" fontWeight="bold">
                        إجمالي المصروفات: {formatNumber(totalCosts)}
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
};
export default CashReconciliationPage;