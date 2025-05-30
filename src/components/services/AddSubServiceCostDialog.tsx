// src/components/services/AddSubServiceCostDialog.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

import { createSubServiceCost } from '@/services/subServiceCostService';
import type { SubServiceCost } from '@/types/services';

interface AddSubServiceCostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubServiceCostAdded: (newType: SubServiceCost) => void;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const getSubServiceCostSchema = (t: (key: string, options?: { field?: string }) => string) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('services:subServiceCostType.nameLabel') }) }).max(255),
});

type SubServiceCostFormValues = z.infer<ReturnType<typeof getSubServiceCostSchema>>;

const AddSubServiceCostDialog: React.FC<AddSubServiceCostDialogProps> = ({ 
  isOpen, onOpenChange, onSubServiceCostAdded 
}) => {
  const { t } = useTranslation(['services', 'common']);

  const subServiceCostSchema = getSubServiceCostSchema(t);
  const form = useForm<SubServiceCostFormValues>({
    resolver: zodResolver(subServiceCostSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: createSubServiceCost,
    onSuccess: (newSubType) => {
      toast.success(t('services:subServiceCostType.addedSuccess'));
      onSubServiceCostAdded(newSubType);
      form.reset();
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || t('services:subServiceCostType.addError'));
    },
  });

  const onSubmit = (data: SubServiceCostFormValues) => mutation.mutate(data);

  useEffect(() => {
    if (!isOpen) {
      form.reset({ name: '' });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('services:subServiceCostType.addDialogTitle')}</DialogTitle>
          <DialogDescription>{t('services:subServiceCostType.addDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('services:subServiceCostType.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('services:subServiceCostType.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>{t('common:cancel')}</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('common:save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default AddSubServiceCostDialog;