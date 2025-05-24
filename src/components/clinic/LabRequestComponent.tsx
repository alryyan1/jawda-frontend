// src/components/clinic/LabRequestComponent.tsx
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MultiValue } from 'react-select';
import Select from 'react-select';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, DollarSign, Microscope } from 'lucide-react';

import type { MainTestStripped } from '@/types/labTests';
import { 
    getAvailableLabTestsForVisit, 
    addLabTestsToVisit,
    getLabRequestsForVisit,
    cancelLabRequest
} from '@/services/labRequestService';
import LabPaymentDialog from './LabPaymentDialog';
import type { LabRequest } from '@/types/visits';


interface LabRequestComponentProps {
  visitId: number;
}

interface TestOption {
  value: number;
  label: string;
  price: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: {
        main_test_id?: string[];
      };
    };
  };
}

const LabRequestComponent: React.FC<LabRequestComponentProps> = ({ visitId }) => {
  const { t } = useTranslation(['labTests', 'clinic', 'common', 'payments']);
  const queryClient = useQueryClient();
  const currentClinicShiftId = 1; // TODO: Replace with actual currentClinicShift.id from context/prop

  const [selectedTestOptions, setSelectedTestOptions] = useState<readonly TestOption[]>([]);
  const [requestComment, setRequestComment] = useState('');
  const [payingLabRequest, setPayingLabRequest] = useState<LabRequest | null>(null);

  const availableTestsQueryKey = ['availableLabTestsForVisit', visitId] as const;
  const requestedTestsQueryKey = ['labRequestsForVisit', visitId] as const;

  const { data: availableTests, isLoading: isLoadingAvailable } = useQuery<MainTestStripped[], Error>({
    queryKey: availableTestsQueryKey,
    queryFn: () => getAvailableLabTestsForVisit(visitId),
  });

  const { data: requestedTests, isLoading: isLoadingRequested } = useQuery<LabRequest[], Error>({
    queryKey: requestedTestsQueryKey,
    queryFn: () => getLabRequestsForVisit(visitId),
  });

  const addTestsMutation = useMutation({
    mutationFn: (payload: { main_test_ids: number[]; comment?: string }) => 
        addLabTestsToVisit({ visitId, ...payload }),
    onSuccess: () => {
      toast.success(t('labTests:request.addedSuccess'));
      setSelectedTestOptions([]);
      setRequestComment('');
      queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
      queryClient.invalidateQueries({ queryKey: availableTestsQueryKey });
    },
    onError: (error: ApiError) => toast.error(error.response?.data?.message || t('common:error.requestFailed'))
  });

  const cancelRequestMutation = useMutation({
    mutationFn: cancelLabRequest,
    onSuccess: () => {
        toast.success(t('labTests:request.cancelledSuccess'));
        queryClient.invalidateQueries({ queryKey: requestedTestsQueryKey });
        queryClient.invalidateQueries({ queryKey: availableTestsQueryKey });
    },
    onError: (error: ApiError) => toast.error(error.response?.data?.message || t('common:error.requestFailed'))
  });

  const handleAddTests = () => {
    if (selectedTestOptions.length > 0) {
      addTestsMutation.mutate({ 
        main_test_ids: selectedTestOptions.map(opt => opt.value),
        comment: requestComment 
      });
    }
  };

  const handleCancelRequest = (labRequestId: number) => {
    if (window.confirm(t('labTests:request.cancelConfirm'))) {
        cancelRequestMutation.mutate(labRequestId);
    }
  };

  const handleSelectChange = (selected: MultiValue<TestOption>) => {
    setSelectedTestOptions(selected);
  };

  const testOptionsForSelect: TestOption[] = useMemo(() => 
    availableTests?.map((test: MainTestStripped) => ({
      value: test.id,
      label: `${test.main_test_name} (${t('common:price')}: ${Number(test.price).toFixed(1)})`,
      price: Number(test.price) || 0,
    })) || [], 
  [availableTests, t]);
  
  // Calculate financial summary for requested lab tests
  const labSummary = useMemo(() => {
    if (!requestedTests) return { total: 0, paid: 0, balance: 0 };
    let total = 0, paid = 0;
    requestedTests.forEach(lr => {
        const price = Number(lr.price) || 0;
        const discountAmount = (price * (Number(lr.discount_per) || 0)) / 100;
        const enduranceAmount = Number(lr.endurance) || 0;
        const netPrice = price - discountAmount - enduranceAmount;
        total += netPrice;
        paid += Number(lr.amount_paid) || 0;
    });
    return { total, paid, balance: total - paid };
  }, [requestedTests]);

  return (
    <div className="space-y-4">
      {/* Section to Add New Lab Requests */}
      <Card>
        <CardHeader><CardTitle className="text-md flex items-center gap-2">
            <Microscope className="h-5 w-5 text-primary"/>{t('labTests:request.title')}
        </CardTitle></CardHeader>
        <CardContent className="space-y-3">
            <div className="space-y-1">
                <Label htmlFor="labtest-multiselect" className="text-xs font-medium">{t('labTests:request.selectTests')}</Label>
                <Select<TestOption, true>
                    id="labtest-multiselect"
                    isMulti
                    options={testOptionsForSelect}
                    value={selectedTestOptions}
                    onChange={handleSelectChange}
                    isLoading={isLoadingAvailable}
                    isDisabled={isLoadingAvailable || addTestsMutation.isPending}
                    placeholder={t('labTests:request.selectTestsPlaceholder')}
                    noOptionsMessage={() => t('labTests:request.noTestsAvailable')}
                    className="react-select-container"
                    classNamePrefix="react-select"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="labrequest-comment" className="text-xs font-medium">{t('labTests:request.commentLabel')}</Label>
                <Textarea 
                    id="labrequest-comment"
                    value={requestComment} 
                    onChange={(e) => setRequestComment(e.target.value)}
                    placeholder={t('labTests:request.commentPlaceholder')}
                    rows={2}
                    disabled={addTestsMutation.isPending}
                />
            </div>
            <Button 
                onClick={handleAddTests} 
                disabled={selectedTestOptions.length === 0 || addTestsMutation.isPending}
                size="sm"
            >
                {addTestsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2"/>}
                {t('labTests:request.requestButton')}
            </Button>
        </CardContent>
      </Card>

      {/* Section for Requested Lab Tests */}
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-2">{t('labTests:request.currentRequestsTitle')}</h4>
        {isLoadingRequested && <div className="py-4 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
        {!isLoadingRequested && (!requestedTests || requestedTests.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('labTests:request.noRequestsYet')}</p>
        )}
        {requestedTests && requestedTests.length > 0 && (
          <Card>
            <ScrollArea className="h-auto max-h-[300px]">
                <Table className="text-xs">
                <TableHeader>
                    <TableRow>
                    <TableHead>{t('labTests:table.testName')}</TableHead>
                    <TableHead className="text-center">{t('labTests:table.price')}</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">{t('labTests:table.discount')}</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">{t('labTests:table.endurance')}</TableHead>
                    <TableHead className="text-center">{t('labTests:table.net')}</TableHead>
                    <TableHead className="text-center">{t('labTests:table.paid')}</TableHead>
                    <TableHead className="text-center">{t('labTests:table.balance')}</TableHead>
                    <TableHead className="text-center hidden md:table-cell">{t('labTests:table.statusPayment')}</TableHead>
                    <TableHead className="text-right">{t('common:actions.openMenu')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requestedTests.map(lr => {
                         const price = Number(lr.price) || 0;
                         const discountAmount = (price * (Number(lr.discount_per) || 0)) / 100;
                         const enduranceAmount = Number(lr.endurance) || 0;
                         const netPrice = price - discountAmount - enduranceAmount;
                         const balance = netPrice - (Number(lr.amount_paid) || 0);
                        return (
                        <TableRow key={lr.id}>
                            <TableCell className="py-1.5">{lr.main_test?.main_test_name || '...'}</TableCell>
                            <TableCell className="text-center py-1.5">{price.toFixed(1)}</TableCell>
                            <TableCell className="text-center hidden sm:table-cell py-1.5">{lr.discount_per}%</TableCell>
                            <TableCell className="text-center hidden sm:table-cell py-1.5">{enduranceAmount.toFixed(1)}</TableCell>
                            <TableCell className="text-center py-1.5 font-medium">{netPrice.toFixed(1)}</TableCell>
                            <TableCell className="text-center py-1.5 text-green-600">{Number(lr.amount_paid).toFixed(1)}</TableCell>
                            <TableCell className={`text-center py-1.5 font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {balance.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell py-1.5">
                                <Badge variant={lr.is_paid ? "default" : "outline"}>{lr.is_paid ? t('payments:status.paid') : t('payments:status.unpaid')}</Badge>
                            </TableCell>
                            <TableCell className="text-right py-1.5">
                                {!lr.is_paid && balance > 0 && currentClinicShiftId && (
                                    <Button size="sm" variant="outline" className="h-6 px-1.5 text-green-600 border-green-500 hover:bg-green-500/10" onClick={() => setPayingLabRequest(lr)}>
                                        <DollarSign className="h-3 w-3"/>
                                    </Button>
                                )}
                                {!lr.is_paid && /* !lr.sample_collected (add this check later) */ (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" 
                                        onClick={() => handleCancelRequest(lr.id)}
                                        disabled={cancelRequestMutation.isPending && cancelRequestMutation.variables === lr.id}
                                        title={t('common:cancelRequest')}
                                    >
                                        {cancelRequestMutation.isPending && cancelRequestMutation.variables === lr.id 
                                            ? <Loader2 className="h-3 w-3 animate-spin"/> 
                                            : <Trash2 className="h-3 w-3"/>}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    )})}
                </TableBody>
                </Table>
            </ScrollArea>
            <div className="text-xs mt-2 p-2 border-t bg-muted/50 rounded-b-md space-y-0.5">
                <div className="flex justify-between"><span>{t('common:totalAmountNet')}:</span> <span className="font-semibold">{labSummary.total.toFixed(1)}</span></div>
                <div className="flex justify-between"><span>{t('common:totalPaid')}:</span> <span className="font-semibold text-green-600">{labSummary.paid.toFixed(1)}</span></div>
                <div className="flex justify-between font-bold"><span>{t('common:totalBalanceDue')}:</span> <span className={labSummary.balance > 0 ? 'text-red-600' : 'text-green-600'}>{labSummary.balance.toFixed(1)}</span></div>
            </div>
          </Card>
        )}
      </div>
      {payingLabRequest && currentClinicShiftId && (
        <LabPaymentDialog
            isOpen={!!payingLabRequest}
            onOpenChange={(open) => !open && setPayingLabRequest(null)}
            labRequest={payingLabRequest}
            currentClinicShiftId={currentClinicShiftId}
            onPaymentSuccess={(updatedLabRequest) => {
                queryClient.setQueryData(requestedTestsQueryKey, (oldData: LabRequest[] | undefined) => 
                    oldData?.map(lr => lr.id === updatedLabRequest.id ? updatedLabRequest : lr) || []
                );
                setPayingLabRequest(null);
            }}
        />
      )}
    </div>
  );
};
export default LabRequestComponent;