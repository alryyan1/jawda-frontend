import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Trash2, DollarSign } from 'lucide-react';

import type { LabRequest } from '@/types/visits';
import type { Shift } from '@/types/shifts';
import type { Patient } from '@/types/patients';
import RequestedLabTestsTable from '../RequestedLabTestsTable';
import type { UseMutationResult } from '@tanstack/react-query';

// Define types for mutation props for clarity and type safety
type DirectPayItemMutationType = UseMutationResult<LabRequest, Error, { labRequestId: number; is_bankak: boolean; shift_id: number; }, unknown>;
type RemoveAllPendingMutationType = UseMutationResult<{ message: string; deleted_count: number; }, Error, void, unknown>;

interface LabRequestDisplayAreaProps {
  visitId: number;
  patientId: number;
  currentPatient: Patient | null;
  requestedTests: LabRequest[];
  isLoadingRequestedTests: boolean;
  isFetchingRequestedTests: boolean;
  currentClinicShift: Shift | null;
  onAddMoreTests: () => void;

  // Mutations are passed from the parent (LabRequestComponent)
  directPayItemMutation: DirectPayItemMutationType; 
  removeAllPendingMutation: RemoveAllPendingMutationType;
  onOpenBatchPaymentDialog: () => void;
}

const LabRequestDisplayArea: React.FC<LabRequestDisplayAreaProps> = ({
  visitId,
  patientId,
  currentPatient,
  requestedTests,
  isLoadingRequestedTests,
  isFetchingRequestedTests,
  currentClinicShift,
  onAddMoreTests,
  directPayItemMutation,
  removeAllPendingMutation,
  onOpenBatchPaymentDialog,
}) => {
  const { t } = useTranslation(['labTests', 'common', 'payments']);
  const isCompanyPatient = !!currentPatient?.company_id;

  // --- Event Handlers that use the passed mutations ---
  const handleDirectPayIndividualItem = (labReq: LabRequest) => {
    if (!currentClinicShift?.id) {
        toast.error(t('payments:error.noActiveShiftForPayment'));
        return;
    }
    const isBankakForThisPayment = !!labReq.is_bankak; 
    const balance = calculateItemBalance(labReq);

    if (balance <= 0.09) {
        toast.info(t('payments:itemAlreadyPaidOrNoBalance'));
        return;
    }
    if (window.confirm(t('payments:confirmDirectPayLabItem', { amount: balance.toFixed(1), testName: labReq.main_test?.main_test_name }))) {
        directPayItemMutation.mutate({ 
            labRequestId: labReq.id, 
            is_bankak: isBankakForThisPayment, 
            shift_id: currentClinicShift.id 
        });
    }
  };
  
  const handleRemoveAllPending = () => {
    // Check if there are any cancellable items
    const cancellableItems = requestedTests.filter(lr => !lr.is_paid && calculateItemBalance(lr) > 0.09);
    if (cancellableItems.length > 0) {
        if (window.confirm(t('labTests:request.removeAllConfirm'))) {
            removeAllPendingMutation.mutate();
        }
    } else {
        toast.info(t('labTests:request.noPendingToRemove'));
    }
  };

  // --- Financial Summary Calculation ---
  const calculateItemBalance = (lr: LabRequest): number => {
    const price = Number(lr.price) || 0;
    const itemSubTotal = price;
    const discountAmount = (itemSubTotal * (Number(lr.discount_per) || 0)) / 100;
    const enduranceAmount = Number(lr.endurance) || 0;
    const netPrice = itemSubTotal - discountAmount - (isCompanyPatient ? enduranceAmount : 0);
    return netPrice - (Number(lr.amount_paid) || 0);
  };

  const labSummary = useMemo(() => {
    if (!requestedTests) return { totalNet: 0, totalPaid: 0, totalBalance: 0 };
    let totalNet = 0, totalPaid = 0;
    requestedTests.forEach(lr => {
        const netPriceForThisItem = calculateItemBalance(lr) + (Number(lr.amount_paid) || 0);
        totalNet += netPriceForThisItem;
        totalPaid += Number(lr.amount_paid) || 0;
    });
    const totalBalance = totalNet - totalPaid;
    return { totalNet, totalPaid, totalBalance };
  }, [requestedTests, calculateItemBalance, isCompanyPatient]);

  // If initial load and no data yet (different from empty data after load)
  if (isLoadingRequestedTests && requestedTests.length === 0) {
    return <div className="py-10 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <>
      <RequestedLabTestsTable
        visitId={visitId}
        patientId={patientId}
        requestedTests={requestedTests}
        isLoading={isLoadingRequestedTests}
        isFetchingList={isFetchingRequestedTests}
        currentClinicShift={currentClinicShift}
        onAddMoreTests={onAddMoreTests}
        onPayIndividual={handleDirectPayIndividualItem}
      />
      
      {/* Summary Section Card */}
      {requestedTests.length > 0 && (
        <Card className="mt-4 shadow">
          <CardHeader className="py-2 flex flex-row justify-between items-center">
            <CardTitle className="text-sm font-semibold">{t('common:summaryFinancial_lab')}</CardTitle>
            {/* Show remove all only if there are items eligible for removal */}
            {requestedTests.some(lr => !lr.is_paid && calculateItemBalance(lr) > 0.09) && (
              <Button 
                variant="ghost" 
                size="xs" 
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2 h-7"
                onClick={handleRemoveAllPending}
                disabled={removeAllPendingMutation.isPending}
              >
                {removeAllPendingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin ltr:mr-1 rtl:ml-1"/> : <Trash2 className="h-3 w-3 ltr:mr-1 rtl:ml-1"/>}
                {t('labTests:request.removeAllButton')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="text-xs space-y-0.5 pt-1 pb-2">
            <div className="flex justify-between"><span>{t('common:totalAmountNet')}:</span> <span className="font-semibold">{labSummary.totalNet.toFixed(1)}</span></div>
            <div className="flex justify-between"><span>{t('common:totalPaid')}:</span> <span className="font-semibold text-green-600 dark:text-green-400">{labSummary.totalPaid.toFixed(1)}</span></div>
            <div className="flex justify-between font-bold text-sm"><span>{t('common:totalBalanceDue')}:</span> <span className={labSummary.totalBalance > 0.09 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{labSummary.totalBalance.toFixed(1)}</span></div>
          </CardContent>
          {labSummary.totalBalance > 0.09 && currentClinicShift?.id && (
            <CardFooter className="pt-2 pb-3 border-t">
              <Button 
                variant="success" 
                size="sm" 
                className="w-full"
                onClick={onOpenBatchPaymentDialog}
                disabled={removeAllPendingMutation.isPending}
              >
                <DollarSign className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5"/> {t('payments:payAllDueLab')}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </>
  );
};
export default LabRequestDisplayArea;