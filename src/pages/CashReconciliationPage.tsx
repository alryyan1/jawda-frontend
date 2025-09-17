import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// MUI
import { Box, Card, CardContent, CardHeader, Typography, FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress } from '@mui/material';

import { formatNumber } from '@/lib/utils';
import { getDenominationsForShift, saveDenominationCounts } from '@/services/cashReconciliationService';
import type { Denomination } from '@/types/cash';
import { getShiftsList } from '@/services/shiftService';
import type { Shift } from '@/types/shifts';

const CashReconciliationPage: React.FC = () => {
    const { currentClinicShift } = useAuth();
    const queryClient = useQueryClient();

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(currentClinicShift?.id.toString() || null);
  const [denominations, setDenominations] = useState<Denomination[]>([]);

  // Fetch all shifts for the dropdown
  const { data: shiftsList, isLoading: isLoadingShifts } = useQuery<Shift[], Error>({
    queryKey: ['allShiftsForReconciliation'],
    queryFn: () => getShiftsList({per_page: 0}),
  });

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

  const saveMutation = useMutation({
    mutationFn: (data: { shiftId: number; counts: Denomination[] }) =>
      saveDenominationCounts(data.shiftId, data.counts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['denominationsForShift', selectedShiftId] });
    },
    onError: () => toast.error('فشل الحفظ')
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
  
  const isLoading = isLoadingShifts || (!!selectedShiftId && isLoadingDenominations);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>تسوية النقدية</Typography>
      
      <Box sx={{ mb: 2, maxWidth: 360 }}>
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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
          <CircularProgress />
        </Box>
      ) : !selectedShiftId ? (
        <Card sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>يرجى اختيار وردية</Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
          {/* Right Column: Denomination Calculator */}
          <Card>
            <CardHeader title="حاسبة الفئات" />
            <CardContent>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {/* Headers */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, px: 1, fontWeight: 600, fontSize: 14, color: 'text.secondary' }}>
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
                      onKeyPress={e => handleCountKeyPress(deno.id, (e.target as HTMLInputElement).value, e)}
                      placeholder="أدخل عدد للإضافة"
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
            </CardContent>
          </Card>
          
          {/* Left Column: Summary */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card>
              <CardHeader title="حساب الموظف" />
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي الفئات</Typography>
                <Typography variant="h5" fontWeight={700}>{formatNumber(totalCalculated, 2)}</Typography>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>الإجمالي مع المصروفات</Typography>
                <Typography variant="h6" fontWeight={700}>0.0</Typography>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>البنك</Typography>
                <Typography variant="h6" fontWeight={700}>0.0</Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
};
export default CashReconciliationPage;