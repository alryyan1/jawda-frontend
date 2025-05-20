// src/components/dashboard/CloseShiftDialog.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

import { Shift } from '@/types/shifts';
import { CloseShiftFormData } from '@/types/dashboard';
import { closeShift } from '@/services/shiftService';

interface CloseShiftDialogProps {
  openShift: Shift; // The shift to be closed
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onShiftClosed: () => void; // Callback after successful close
}

const getCloseShiftSchema = (t: Function) => z.object({
  total: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber') }),
  bank: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber') }),
  expenses: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: t('common:validation.positiveNumber') }),
  touched: z.boolean().optional(),
});
type CloseShiftFormValues = z.infer<ReturnType<typeof getCloseShiftSchema>>;

const CloseShiftDialog: React.FC<CloseShiftDialogProps> = ({ openShift, isOpen, onOpenChange, onShiftClosed }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const queryClient = useQueryClient();

  const closeShiftSchema = getCloseShiftSchema(t);
  const form = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues: { total: '0', bank: '0', expenses: '0', touched: openShift.touched || false },
  });

  const mutation = useMutation({
    mutationFn: (data: CloseShiftFormData) => closeShift(openShift.id, data),
    onSuccess: () => {
      toast.success(t('dashboard:shiftClosedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['currentOpenShift'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }); // Invalidate summary too
      onShiftClosed();
      form.reset();
      onOpenChange(false); // Close dialog
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('dashboard:shiftClosedError'));
    },
  });

  const onSubmit = (data: CloseShiftFormValues) => {
    mutation.mutate(data);
  };

  // Reset form if openShift changes (though dialog typically closes)
  React.useEffect(() => {
    form.reset({ total: '0', bank: '0', expenses: '0', touched: openShift.touched || false });
  }, [openShift, form, isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dashboard:closeShiftDialog.title', { shiftId: openShift.id })}</DialogTitle>
          <DialogDescription>{t('dashboard:closeShiftDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="total" render={({ field }) => (
              <FormItem><FormLabel>{t('dashboard:closeShiftDialog.totalLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bank" render={({ field }) => (
              <FormItem><FormLabel>{t('dashboard:closeShiftDialog.bankLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="expenses" render={({ field }) => (
              <FormItem><FormLabel>{t('dashboard:closeShiftDialog.expensesLabel')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="touched" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rtl:space-x-reverse pt-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal">{t('dashboard:closeShiftDialog.touchedLabel')}</FormLabel>
                </FormItem>
            )} />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('dashboard:closeShiftDialog.closeAndSubmitButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CloseShiftDialog;