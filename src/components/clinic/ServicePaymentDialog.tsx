// src/components/clinic/ServicePaymentDialog.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
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
import { recordServicePayment } from '@/services/visitService'; // Your service

interface ServicePaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestedService: RequestedService;
  visitId: number;
  currentClinicShiftId: number;
  onPaymentSuccess: () => void;
}

const getPaymentSchema = (t: Function, maxAmount: number) => z.object({
  amount: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('common:validation.positiveNumber') })
    .refine(val => parseFloat(val) <= maxAmount, { message: t('payments:validation.amountExceedsBalance', { balance: maxAmount.toFixed(2) }) }),
  is_bank: z.string().min(1, { message: t('common:validation.required', { field: t('payments:paymentMethod')}) }), // "0" for cash, "1" for bank
});


const ServicePaymentDialog: React.FC<ServicePaymentDialogProps> = ({ 
    isOpen, onOpenChange, requestedService, visitId, currentClinicShiftId, onPaymentSuccess 
}) => {
  const { t } = useTranslation(['payments', 'common']); // New namespace 'payments'
  
  const balance = useMemo(() => {
    const itemPrice = Number(requestedService.price) || 0;
    const itemCount = Number(requestedService.count) || 1;
    const subTotal = itemPrice * itemCount;
    const discountAmount = (subTotal * (Number(requestedService.discount_per) || 0)) / 100 + (Number(requestedService.discount) || 0);
    const netPrice = subTotal - discountAmount;
    return netPrice - (Number(requestedService.amount_paid) || 0);
  }, [requestedService]);

  const paymentSchema = getPaymentSchema(t, balance);
  type PaymentFormValues = z.infer<ReturnType<typeof getPaymentSchema>>;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: balance > 0 ? balance.toFixed(2) : '0.00', is_bank: "0" }, // Default to balance, cash
  });

  useEffect(() => { // Reset form when requestedService or isOpen changes
    if (isOpen) {
        form.reset({ amount: balance > 0 ? balance.toFixed(2) : '0.00', is_bank: "0" });
    }
  }, [isOpen, requestedService, balance, form]);

  const mutation = useMutation({
    mutationFn: (data: { amount: number; is_bank: boolean }) => 
        recordServicePayment({ 
            requested_service_id: requestedService.id, 
            amount: data.amount, 
            is_bank: data.is_bank,
            shift_id: currentClinicShiftId // Pass current general clinic shift
        }),
    onSuccess: () => {
      toast.success(t('payments:paymentSuccess'));
      onPaymentSuccess(); // This will invalidate queries and close dialog from parent
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('payments:paymentError'));
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    mutation.mutate({ amount: parseFloat(data.amount), is_bank: data.is_bank === "1" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('payments:dialogTitle', { serviceName: requestedService.service?.name || 'Service' })}</DialogTitle>
          <DialogDescription>
            {t('payments:balanceDue')}: <span className="font-semibold">{balance.toFixed(2)}</span> {t('common:currency')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('payments:amountToPay')}</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="is_bank" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>{t('payments:paymentMethod')}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4 rtl:space-x-reverse"
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
              <Button type="submit" disabled={mutation.isPending || balance <= 0}>
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