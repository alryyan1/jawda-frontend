// src/components/clinic/ServicePaymentDialog.tsx
import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import type { RequestedService } from '@/types/services';
import { recordServicePayment } from '@/services/visitService';
import { formatNumber } from '@/lib/utils'; // Assuming you have this
import type { DoctorVisit } from '@/types/visits';

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
    onSuccess: () => {
      toast.success("تم الدفع بنجاح");
      handlePrintReceipt();
      onPaymentSuccess();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "حدث خطأ في الدفع");
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
    return isOpen ? <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent><div className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin"/></div></DialogContent></Dialog> : null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>دفع الخدمة</DialogTitle>
          <DialogDescription>
            المبلغ الإجمالي: <span className="font-semibold">{formatNumber(fullNetPrice)}</span> ريال <br/>
            {isCompanyPatient && requestedService.endurance > 0 && (
                <span className="text-xs text-muted-foreground">
                    (التأمين: {formatNumber(Number(requestedService.endurance) * (Number(requestedService.count) || 1))} ريال) <br/>
                </span>
            )}
            المبلغ المتبقي: <span className="font-semibold">{formatNumber(displayBalance)}</span> ريال
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value)}
                    value={String(field.value)} // Ensure value is string for input
                    disabled={mutation.isPending || (displayBalance <= 0 && parseFloat(field.value) <= 0) }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={control} name="is_bank" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>طريقة الدفع</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4 rtl:space-x-reverse"
                    disabled={mutation.isPending || (displayBalance <= 0 && parseFloat(getValues("amount")) <= 0)}
                  >
                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                      <FormControl><RadioGroupItem value="0" id={`cash-${requestedService.id}`} /></FormControl>
                      <FormLabel htmlFor={`cash-${requestedService.id}`} className="font-normal">نقدي</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                      <FormControl><RadioGroupItem value="1" id={`bank-${requestedService.id}`} /></FormControl>
                      <FormLabel htmlFor={`bank-${requestedService.id}`} className="font-normal">بنكي</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>إلغاء</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending || (displayBalance <= 0 && parseFloat(getValues("amount")) <= 0)}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                دفع
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ServicePaymentDialog;