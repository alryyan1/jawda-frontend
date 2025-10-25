// src/components/clinic/ServicePaymentDialog.tsx
import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { 
  Dialog as MUIDialog,
  DialogTitle,
  DialogContent as MUIDialogContent,
  DialogActions,
  Button as MUIButton,
  TextField,
  RadioGroup as MUIRadioGroup,
  FormControl as MUIFormControl,
  FormControlLabel,
  Radio,
  FormLabel as MUIFormLabel,
  Typography,
  Box
} from '@mui/material';
import { Loader2 } from 'lucide-react';
import type { RequestedService } from '@/types/services';
import { recordServicePayment } from '@/services/visitService';
import { formatNumber } from '@/lib/utils'; // Assuming you have this
import type { DoctorVisit } from '@/types/visits';
import { useAuth } from '@/contexts/AuthContext';
import realtimeService from '@/services/realtimeService';

interface ServicePaymentDialogProps {
  visit?: DoctorVisit;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestedService: RequestedService;
  visitId: number;
  currentClinicShiftId: number;
  onPaymentSuccess: () => void;
  handlePrintReceipt:()=>void;
}

interface PaymentFormValues {
  amount: string;
  is_bank: string;
}

const ServicePaymentDialog: React.FC<ServicePaymentDialogProps> = ({ 
  handlePrintReceipt,
  visit,
  isOpen, onOpenChange, requestedService, visitId, currentClinicShiftId, onPaymentSuccess 
}) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
  // const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient, Error>({
  //   queryKey: ['patientDetailsForPaymentDialog', visitId],
  //   queryFn: () => getPatientById(visitId),
  //   enabled: isOpen && !!visitId,
  // });

  const isCompanyPatient = useMemo(() => !!visit?.patient?.company_id, [visit?.patient?.company_id]);

  const { displayBalance, calculatedPaymentDefault, fullNetPrice } = useMemo(() => {
    if (!requestedService) return { displayBalance: 0, calculatedPaymentDefault: 0, fullNetPrice: 0 };

    const itemPrice = Number(requestedService.price) || 0;
    const itemCount = Number(requestedService.count) || 1;
    const subTotal = itemPrice * itemCount;
    
    const discountFromPercentage = (subTotal * (Number(requestedService.discount_per) || 0)) / 100;
    const fixedDiscount = Number(requestedService.discount) || 0;
    const totalDiscount = discountFromPercentage + fixedDiscount;
    const amountAfterDiscount = subTotal - totalDiscount;
    
    const enduranceAmountPerItem = Number(requestedService.endurance) || 0;
    const totalEnduranceAmount = enduranceAmountPerItem * itemCount; // Endurance applies per item count

    const alreadyPaidByPatient = Number(requestedService.amount_paid) || 0;
    
    let netPayableByPatient: number;
    let paymentDefault: number;
    if (isCompanyPatient) {
        // For company patient, what they are expected to pay is the amount *after* company endurance.
        // The 'endurance' field on RequestedService already represents the company's part for this service instance.
        netPayableByPatient =  totalEnduranceAmount;
        paymentDefault = totalEnduranceAmount;
    } else {
        // For cash patient, they pay the amount after discount. Endurance is not applicable.
        netPayableByPatient = amountAfterDiscount;
        paymentDefault = netPayableByPatient - alreadyPaidByPatient;
    }
    
    // Ensure payment default and display balance are not negative
    const finalPaymentDefault = paymentDefault < 0 ? 0 : paymentDefault;
    const finalDisplayBalance = netPayableByPatient - alreadyPaidByPatient < 0 ? 0 : netPayableByPatient - alreadyPaidByPatient;

    return { 
        displayBalance: finalDisplayBalance, 
        calculatedPaymentDefault: finalPaymentDefault,
        fullNetPrice: amountAfterDiscount // Price after discount, before endurance or payment
    };

  }, [requestedService, isCompanyPatient]); 

  const form = useForm<PaymentFormValues>({
    defaultValues: { 
        amount: calculatedPaymentDefault > 0 ? calculatedPaymentDefault.toFixed(1) : '0.00', 
        is_bank: '0' 
    }
  });

  const { control, handleSubmit, setValue, getValues } = form;

  useEffect(() => {
    if (isOpen) {
        const defaultAmount = calculatedPaymentDefault > 0 ? calculatedPaymentDefault.toFixed(1) : '0.00';
        form.reset();
        setValue("amount", defaultAmount);
    }
  }, [isOpen, requestedService, calculatedPaymentDefault, form, setValue]);

  const mutation = useMutation({
    mutationFn: (data: PaymentFormValues) => 
        recordServicePayment({
            requested_service_id: requestedService.id,
            amount: parseFloat(data.amount),
            is_bank: data.is_bank === "1",
            shift_id: currentClinicShiftId
        }),
    onSuccess: async () => {
      toast.success("تم الدفع بنجاح");
      
      // Print services receipt after successful payment (non-blocking)
      if (visitId && visit?.patient_id) {
        realtimeService.printServicesReceipt(visitId, visit.patient_id)
          .then(result => {
            if (result.success) {
              toast.success('تم طباعة إيصال الخدمات بنجاح');
            } else {
              // toast.error(result.error || 'فشل في طباعة إيصال الخدمات');
            }
          })
          .catch(error => {
            console.error('Error printing services receipt:', error);
            // toast.error('حدث خطأ أثناء طباعة إيصال الخدمات');
          });
      }
      
      // Also call the original print receipt function for PDF preview
      handlePrintReceipt();
      onPaymentSuccess();
      const key = ["userShiftIncomeSummary", user?.id, currentClinicShiftId] as const;
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      // toast.error(error.response?.data?.message || "حدث خطأ في الدفع");
    },
  });

  const onSubmit = useCallback((data: PaymentFormValues) => {
    const amount = parseFloat(data.amount);
    if (displayBalance <= 0 && amount <= 0) {
        toast.info("لا يوجد مبلغ للدفع");
        onOpenChange(false);
        return;
    }
    mutation.mutate(data);
  }, [displayBalance, onOpenChange, mutation]);
  
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const amount = parseFloat(getValues("amount"));
      const displayBalanceCheck = displayBalance <= 0 && amount <= 0;
      const isPendingCheck = mutation.isPending;

      if (!displayBalanceCheck && !isPendingCheck) {
        handleSubmit(onSubmit)();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
    }
  }, [isOpen, getValues, displayBalance, mutation.isPending, handleSubmit, onSubmit, onOpenChange]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [isOpen, handleKeyPress]);

  if (!isOpen || (!visit?.patient && visitId)) {
    return isOpen ? <MUIDialog open={isOpen} onClose={() => onOpenChange(false)}><MUIDialogContent><div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin"/></div></MUIDialogContent></MUIDialog> : null;
  }

  return (
    <MUIDialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="sm">
      <DialogTitle>دفع الخدمة</DialogTitle>
      <MUIDialogContent>
        <Box mb={1.5}>
          <Typography variant="body2">
            المبلغ الإجمالي: <strong>{formatNumber(fullNetPrice)}</strong> 
          </Typography>
          {isCompanyPatient && requestedService.endurance > 0 && (
            <Typography variant="caption" color="text.secondary">
              (التأمين: {formatNumber(Number(requestedService.endurance) * (Number(requestedService.count) || 1))} )
            </Typography>
          )}
          <Typography variant="body2">
            المبلغ المتبقي: <strong>{formatNumber(displayBalance)}</strong> 
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <TextField
                label="المبلغ"
                type="number"
                inputProps={{ step: 0.01 }}
                value={String(field.value ?? '')}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={mutation.isPending || (displayBalance <= 0 && parseFloat(String(field.value || '0')) <= 0)}
                fullWidth
                size="small"
              />
            )}
          />

          <Controller
            name="is_bank"
            control={control}
            render={({ field }) => (
              <MUIFormControl disabled={mutation.isPending || (displayBalance <= 0 && parseFloat(getValues('amount')) <= 0)}>
                <MUIFormLabel>طريقة الدفع</MUIFormLabel>
                <MUIRadioGroup row value={field.value} onChange={(_e, val) => field.onChange(val)}>
                  <FormControlLabel value="0" control={<Radio />} label="نقدي" />
                  <FormControlLabel value="1" control={<Radio />} label="بنكي" />
                </MUIRadioGroup>
              </MUIFormControl>
            )}
          />

          <DialogActions sx={{ px: 0 }}>
            <MUIButton type="button" variant="outlined" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>
              إلغاء
            </MUIButton>
            <MUIButton type="submit" variant="contained" disabled={mutation.isPending || (displayBalance <= 0 && parseFloat(getValues('amount')) <= 0)}>
              {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
              دفع
            </MUIButton>
          </DialogActions>
        </Box>
      </MUIDialogContent>
    </MUIDialog>
  );
};
export default ServicePaymentDialog;