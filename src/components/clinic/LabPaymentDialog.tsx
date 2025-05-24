// src/components/clinic/LabPaymentDialog.tsx
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

import type { LabRequest } from '@/types/visits';
import { recordLabRequestPayment } from '@/services/labRequestService';

interface LabPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  labRequest: LabRequest;
  currentClinicShiftId: number;
  onPaymentSuccess: (updatedLabRequest: LabRequest) => void;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

const getLabPaymentSchema = (t: TranslateFunction, maxAmount: number) => z.object({
  amount_to_pay: z.string()
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: t('common:validation.positiveNumber') })
    .refine(val => parseFloat(val) <= maxAmount, { message: t('payments:validation.amountExceedsBalance', { balance: maxAmount.toFixed(2) }) }),
  is_bankak: z.string().min(1, { message: t('common:validation.required', { field: t('payments:paymentMethod')}) }), // "0" cash, "1" bank
});

const LabPaymentDialog: React.FC<LabPaymentDialogProps> = ({ 
    isOpen, onOpenChange, labRequest, currentClinicShiftId, onPaymentSuccess 
}) => {
  const { t } = useTranslation(['payments', 'common', 'labTests']);
  
  const netPayable = useMemo(() => {
    const price = Number(labRequest.price) || 0;
    const discountAmount = (price * (Number(labRequest.discount_per) || 0)) / 100;
    return price - discountAmount - (Number(labRequest.endurance) || 0);
  }, [labRequest]);

  const balanceDue = useMemo(() => {
    return netPayable - (Number(labRequest.amount_paid) || 0);
  }, [netPayable, labRequest.amount_paid]);

  const paymentSchema = getLabPaymentSchema(t, balanceDue);
  type PaymentFormValues = z.infer<ReturnType<typeof getLabPaymentSchema>>;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount_to_pay: balanceDue > 0 ? balanceDue.toFixed(1) : '0.0', is_bankak: "0" },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ amount_to_pay: balanceDue > 0 ? balanceDue.toFixed(1) : '0.0', is_bankak: "0" });
    }
  }, [isOpen, balanceDue, form]);

  const mutation = useMutation({
    mutationFn: (data: { amount_to_pay: number; is_bankak: boolean }) => 
        recordLabRequestPayment(labRequest.id, { 
            ...data, 
            shift_id: currentClinicShiftId 
        }),
    onSuccess: (updatedLabRequest) => {
      toast.success(t('payments:paymentSuccess'));
      onPaymentSuccess(updatedLabRequest);
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || t('payments:paymentError'));
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    mutation.mutate({ amount_to_pay: parseFloat(data.amount_to_pay), is_bankak: data.is_bankak === "1" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('payments:dialogTitleLab', { testName: labRequest.main_test?.main_test_name || t('labTests:testEntityName') })}</DialogTitle>
          <DialogDescription>
            {t('payments:balanceDue')}: <span className="font-semibold">{balanceDue.toFixed(1)}</span> {t('common:currency')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="amount_to_pay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('payments:amountToPay')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} disabled={mutation.isPending || balanceDue <= 0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_bankak"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>{t('payments:paymentMethod')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4 rtl:space-x-reverse"
                      disabled={mutation.isPending || balanceDue <= 0}
                    >
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem value="0" id={`cash-lab-${labRequest.id}`} />
                        </FormControl>
                        <FormLabel htmlFor={`cash-lab-${labRequest.id}`} className="font-normal">
                          {t('payments:cash')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 rtl:space-x-reverse">
                        <FormControl>
                          <RadioGroupItem value="1" id={`bank-lab-${labRequest.id}`} />
                        </FormControl>
                        <FormLabel htmlFor={`bank-lab-${labRequest.id}`} className="font-normal">
                          {t('payments:bank')}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={mutation.isPending}>
                  {t('common:cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending || balanceDue <= 0}>
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

export default LabPaymentDialog;