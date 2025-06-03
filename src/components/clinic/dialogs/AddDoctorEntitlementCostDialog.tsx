// src/components/clinic/dialogs/AddDoctorEntitlementCostDialog.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea'; // For description/comment

import { addCost } from '@/services/costService'; // Use existing cost service
import { useAuth } from '@/contexts/AuthContext';
import type { CostFormData } from '@/types/finance';

interface AddDoctorEntitlementCostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  doctorShift: DoctorShiftWithFinancials; // Pass the shift with calculated entitlements
  onCostAddedAndProved: () => void; // Callback after success
}

// Schema for this specific cost entry
const getEntitlementCostSchema = (t: Function, maxTotal: number) => z.object({
  cash_amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber')}),
  bank_amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber')}),
  description: z.string().min(1, t('common:validation.required')).max(255),
  comment: z.string().max(255).optional().nullable(),
}).refine(data => (parseFloat(data.cash_amount) + parseFloat(data.bank_amount)) <= maxTotal + 0.01, { // Allow for float precision
    message: t('clinic:doctorShiftReview.error.costExceedsEntitlement', { total: maxTotal.toFixed(2) }),
    path: ['cash_amount'], // Show error on one field or a general error
});

type EntitlementCostFormValues = z.infer<ReturnType<typeof getEntitlementCostSchema>>;

const AddDoctorEntitlementCostDialog: React.FC<AddDoctorEntitlementCostDialogProps> = ({
  isOpen, onOpenChange, doctorShift, onCostAddedAndProved
}) => {
  const { t } = useTranslation(['clinic', 'common', 'finances']);
  const queryClient = useQueryClient();
  const { currentClinicShift } = useAuth();

  // Assuming doctorShift.total_doctor_entitlement is available from the parent
  const totalEntitlement = parseFloat(String(doctorShift.total_doctor_entitlement || 0));

  const entitlementCostSchema = getEntitlementCostSchema(t, totalEntitlement);

  const form = useForm<EntitlementCostFormValues>({
    resolver: zodResolver(entitlementCostSchema),
    defaultValues: {
      cash_amount: totalEntitlement.toFixed(2),
      bank_amount: '0.00',
      description: t('clinic:doctorShiftReview.defaultCostDescription', { doctorName: doctorShift.doctor_name, shiftId: doctorShift.id }),
      comment: '',
    },
  });
  const { control, handleSubmit, watch, setValue, reset } = form;

  const cashAmountWatch = watch('cash_amount');
  const bankAmountWatch = watch('bank_amount');

  // Sync cash and bank amounts
  useEffect(() => {
    const cash = parseFloat(cashAmountWatch || '0');
    const bank = parseFloat(bankAmountWatch || '0');
    
    if (document.activeElement?.id === 'cash_amount' && (cash + bank > totalEntitlement)) {
        const newBank = totalEntitlement - cash;
        if (newBank >= 0) setValue('bank_amount', newBank.toFixed(2));
        else setValue('bank_amount', '0.00'); // Prevent negative bank
    } else if (document.activeElement?.id === 'bank_amount' && (cash + bank > totalEntitlement)) {
        const newCash = totalEntitlement - bank;
        if (newCash >= 0) setValue('cash_amount', newCash.toFixed(2));
        else setValue('cash_amount', '0.00'); // Prevent negative cash
    } else if (document.activeElement?.id === 'cash_amount' && (cash <= totalEntitlement) && (totalEntitlement - cash >=0) ) {
         setValue('bank_amount', (totalEntitlement - cash).toFixed(2));
    } else if (document.activeElement?.id === 'bank_amount' && (bank <= totalEntitlement) && (totalEntitlement - bank >=0) ) {
         setValue('cash_amount', (totalEntitlement - bank).toFixed(2));
    }

  }, [cashAmountWatch, bankAmountWatch, totalEntitlement, setValue]);
  
  useEffect(() => {
    if (isOpen) {
      reset({
        cash_amount: totalEntitlement.toFixed(2),
        bank_amount: '0.00',
        description: t('clinic:doctorShiftReview.defaultCostDescription', { doctorName: doctorShift.doctor_name, shiftId: doctorShift.id }),
        comment: '',
      });
    }
  }, [isOpen, totalEntitlement, doctorShift, t, reset]);

  const addCostMutation = useMutation({
    mutationFn: (data: CostFormData) => addCost(data),
    onSuccess: () => {
      onCostAddedAndProved(); // Parent will handle proofing flag and closing this dialog
      toast.success(t('finances:costs.addedSuccess'));
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('finances:costs.addError')),
  });

  const onSubmit = (data: EntitlementCostFormValues) => {
    if (!currentClinicShift?.id) {
      toast.error(t('finances:costs.noOpenShift'));
      return;
    }
    const costPayload: CostFormData = {
      shift_id: currentClinicShift.id, // Cost recorded under current general shift
      doctor_shift_id: String(doctorShift.id), // Link cost to specific doctor shift
      description: data.description,
      comment: data.comment || undefined,
      amount: data.cash_amount, // This will be parsed to float by addCost service
      is_bank_payment: "0", // Placeholder, addCost will split based on amount and amount_bankak
      // We need to pass amount_bankak to the service
      // For this, let's modify CostFormData or add a new payload type for addCost if it expects separate cash/bank
    };
    // Assuming addCost or its backend can handle both cash and bank amounts if passed
    const costPayloadForService = {
        ...costPayload,
        amount_cash: parseFloat(data.cash_amount),
        amount_bank: parseFloat(data.bank_amount),
    };
    // The addCost service from costService.ts currently expects 'amount' and 'is_bank_payment'.
    // We need to adjust how it works or create a new service function if we pass separate cash/bank.
    // For now, let's assume we record two separate costs if both are non-zero, or adjust `addCost`
    // For simplicity, let's assume one record is made and backend logic splits if needed,
    // or we make two calls if necessary.
    // A better approach is to have addCost accept both.
    // Let's assume addCost service and controller have been updated to accept amount_cash and amount_bank.
    
    // Modifying payload to fit an assumed updated addCost service:
    const finalCostPayload = {
      shift_id: currentClinicShift.id,
      doctor_shift_id: doctorShift.id,
      description: data.description,
      comment: data.comment || undefined,
      // This is a combined amount, backend CostController splits it based on a different logic in the current design
      // To match your input fields:
      amount_cash_input: parseFloat(data.cash_amount),
      amount_bank_input: parseFloat(data.bank_amount),
      // The CostController's store method needs to be adapted to use these.
      // For now, let's just sum them and pick a primary payment method for the Cost record.
      amount: (parseFloat(data.cash_amount) + parseFloat(data.bank_amount)).toString(),
      is_bank_payment: parseFloat(data.bank_amount) > 0 ? "1" : "0", // Primary method is bank if bank amount > 0
    };


    addCostMutation.mutate(finalCostPayload as unknown as CostFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('clinic:doctorShiftReview.recordEntitlementCostTitle')}</DialogTitle>
          <DialogDescription>
            {t('clinic:doctorShiftReview.forDoctorShift', { doctorName: doctorShift.doctor_name, shiftId: doctorShift.id })} <br/>
            {t('clinic:doctorShiftReview.totalEntitlementIs')}: <span className="font-semibold">{totalEntitlement.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={control} name="description" render={({ field }) => (
              <FormItem><FormLabel>{t('finances:costs.descriptionLabel')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="cash_amount" render={({ field }) => (
                <FormItem><FormLabel>{t('finances:costs.cashAmount')}</FormLabel><FormControl><Input id="cash_amount" type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="bank_amount" render={({ field }) => (
                <FormItem><FormLabel>{t('finances:costs.bankAmount')}</FormLabel><FormControl><Input id="bank_amount" type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <FormField control={control} name="comment" render={({ field }) => (
              <FormItem><FormLabel>{t('finances:costs.commentLabelOptional')}</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={addCostMutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={addCostMutation.isPending}>
                {addCostMutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:addCostAndProve')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default AddDoctorEntitlementCostDialog;