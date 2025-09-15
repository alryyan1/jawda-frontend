import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { getDenominationsForShift, saveDenominationCounts } from '@/services/cashReconciliationService';
import type { Denomination } from '@/types/cash';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      // toast.success(t('saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['denominationsForShift', selectedShiftId] });
    },
    onError: () => toast.error('saveError'),
  });

  const handleCountKeyPress = (id: number, count: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const newCount = parseInt(count, 10);
      if (!isNaN(newCount) && newCount >= 0) {
        setDenominations(prev => {
          const updatedDenominations = prev.map(deno => 
            deno.id === id ? { ...deno, count: deno.count + newCount } : deno
          );
          
          // Auto-save after updating
          if (selectedShiftId) {
            saveMutation.mutate({ 
              shiftId: Number(selectedShiftId), 
              counts: updatedDenominations 
            });
          }
          
          return updatedDenominations;
        });
        
        // Clear the input field
        event.currentTarget.value = '';
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
        
        // Auto-save after updating
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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">pageTitle</h1>
      
      <div className="mb-6 max-w-sm">
        <label htmlFor="shift-select" className="text-sm font-medium text-muted-foreground">selectShift</label>
        <Select
            value={selectedShiftId || ''}
            onValueChange={setSelectedShiftId}
            dir="rtl"
            disabled={isLoadingShifts}
        >
            <SelectTrigger id="shift-select"><SelectValue placeholder="selectShiftPlaceholder" /></SelectTrigger>
            <SelectContent>
                {shiftsList?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name || `Shift #${s.id} (${new Date(s.created_at).toLocaleDateString()})`}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : !selectedShiftId ? (
        <Card className="p-10 text-center text-muted-foreground">pleaseSelectShift</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Right Column: Denomination Calculator */}
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>calculatorTitle</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Headers */}
                <div className="grid grid-cols-4 gap-4 px-2 font-semibold text-sm text-muted-foreground">
                  <div className="text-center">denominationHeader</div>
                  <div className="text-center">countHeader</div>
                  <div className="text-center">sumOfCountsHeader</div>
                  <div className="text-center">totalHeader</div>
                </div>
                {/* Denomination Rows */}
                {denominations.map(deno => (
                  <div key={deno.id} className="grid grid-cols-4 gap-4 items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md text-center font-bold text-blue-800 dark:text-blue-200">
                      {deno.name}
                    </div>
                    <Input
                      type="number"
                      defaultValue=""
                      onKeyPress={e => handleCountKeyPress(deno.id, e.currentTarget.value, e)}
                        placeholder="countInputPlaceholder"
                      className="text-center"
                    />
                    <Input 
                      value={deno.count} 
                      onChange={(e) => handleSumChange(deno.id, e.target.value)}
                      onBlur={(e) => handleSumChange(deno.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSumChange(deno.id, e.currentTarget.value);
                          e.currentTarget.blur();
                        }
                      }}
                      className="text-center bg-green-50 dark:bg-green-900/20 font-bold text-green-700 dark:text-green-300" 
                    />
                    <Input readOnly value={formatNumber(deno.name * deno.count, 0)} className="text-center font-bold" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Left Column: Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>summary.employeeAccount</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-center">
                <p className="text-xs text-muted-foreground">summary.totalDenominations</p>
                <p className="text-2xl font-bold">{formatNumber(totalCalculated, 2)}</p>
                
                {/* Other summary fields from your image would go here */}
                {/* These would need to be fetched from a separate API endpoint */}
                <p className="text-xs text-muted-foreground mt-4">summary.totalWithExpenses</p>
                <p className="text-2xl font-bold">0.0</p>
                
                <p className="text-xs text-muted-foreground mt-4">summary.bank</p>
                <p className="text-2xl font-bold">0.0</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
export default CashReconciliationPage;