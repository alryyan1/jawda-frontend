// src/components/clinic/ServicePaymentDialog.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import type { Patient } from '@/types/patients';
import { recordServicePayment } from '@/services/visitService';
import { getPatientById } from '@/services/patientService';
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

const paymentSchema = z.object({
  amount: z.string()
    .refine(val => !isNaN(parseFloat(val)), { message: 'Must be numeric' })
    .transform(val => parseFloat(val))
    .refine(val => val >= 0.01, { message: 'Amount must be at least 0.01' })
    .refine(val => val <= 999999.99, { message: 'Amount exceeds maximum' }),
  is_bank: z.string().min(1, { message: 'Payment method is required' }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const ServicePaymentDialog: React.FC<ServicePaymentDialogProps> = ({ 
  handlePrintReceipt,
  visit,
  isOpen, onOpenChange, requestedService, visitId, currentClinicShiftId, onPaymentSuccess 
}) => {
  const { t } = useTranslation(['payments', 'common']);
  
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
    console.log(isCompanyPatient,'isCompanyPatient')
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
        is_bank: "0" 
    },
    resolver: (values) => {
      const errors: Record<string, { type: string; message: string }> = {};
      
      // Validate amount
      const amount = parseFloat(values.amount);
      if (isNaN(amount)) {
        errors.amount = {
          type: 'validate',
          message: t('common:validation.mustBeNumeric')
        };
      } else if (displayBalance > 0 && amount < 0.01) {
        errors.amount = {
          type: 'validate',
          message: t('payments:validation.amountMinRequired', { amount: '0.01' })
        };
      } else if (amount > displayBalance + 0.009) {
        errors.amount = {
          type: 'validate',
          message: t('payments:validation.amountExceedsBalance', { balance: displayBalance.toFixed(1) })
        };
      }

      // Validate payment method
      if (!values.is_bank) {
        errors.is_bank = {
          type: 'validate',
          message: t('common:validation.required', { field: t('payments:paymentMethod') })
        };
      }

      return {
        values,
        errors: Object.keys(errors).length > 0 ? errors : {}
      };
    }
  });

  const { control, handleSubmit, setValue, getValues } = form;

  useEffect(() => {
    if (isOpen) {
        const defaultAmount = calculatedPaymentDefault > 0 ? calculatedPaymentDefault.toFixed(1) : '0.00';
        form.reset({ 
            amount: defaultAmount,
            is_bank: "0" 
        });
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
      toast.success(t('payments:paymentSuccess'));
    handlePrintReceipt()
      
      onPaymentSuccess();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || t('payments:paymentError'));
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    const amount = parseFloat(data.amount);
    if (displayBalance <= 0 && amount <= 0) {
        toast.info(t('payments:itemAlreadyPaidOrNoBalance'));
        onOpenChange(false);
        return;
    }
    mutation.mutate(data);
  };
  
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const amount = parseFloat(getValues('amount'));
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
          <DialogTitle>{t('payments:dialogTitle', { serviceName: requestedService.service?.name || 'Service' })}</DialogTitle>
          <DialogDescription>
            {t('payments:netPriceAfterDiscount')}: <span className="font-semibold">{formatNumber(fullNetPrice)}</span> {t('common:currencySymbolShort')} <br/>
            {isCompanyPatient && requestedService.endurance > 0 && (
                <span className="text-xs text-muted-foreground">
                    ({t('payments:companyEnduranceApplied')}: {formatNumber(Number(requestedService.endurance) * (Number(requestedService.count) || 1))} {t('common:currencySymbolShort')}) <br/>
                </span>
            )}
            {t('payments:patientPayableBalance')}: <span className="font-semibold">{formatNumber(displayBalance)}</span> {t('common:currencySymbolShort')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('payments:amountToPayNow')}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value)}
                    value={String(field.value)} // Ensure value is string for input
                    disabled={mutation.isPending || (displayBalance <= 0 && field.value <= 0) }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={control} name="is_bank" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>{t('payments:paymentMethod')}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4 rtl:space-x-reverse"
                    disabled={mutation.isPending || (displayBalance <= 0 && getValues("amount") <= 0)}
                  >
                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                      <FormControl><RadioGroupItem value="0" id={`cash-${requestedService.id}`} /></FormControl>
                      <FormLabel htmlFor={`cash-${requestedService.id}`} className="font-normal">{t('payments:cash')}</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                      <FormControl><RadioGroupItem value="1" id={`bank-${requestedService.id}`} /></FormControl>
                      <FormLabel htmlFor={`bank-${requestedService.id}`} className="font-normal">{t('payments:bank')}</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending || (displayBalance <= 0 && getValues("amount") <= 0)}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:pay')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ServicePaymentDialog;