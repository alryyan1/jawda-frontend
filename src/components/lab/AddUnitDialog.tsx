// src/components/lab/AddUnitDialog.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';

import { createUnit } from '@/services/unitService'; // Your service function
import type { Unit } from '@/types/labTests';           // Your type

interface AddUnitDialogProps {
  onUnitAdded: (newUnit: Unit) => void; // Callback after successful add
  triggerButton?: React.ReactNode;      // Optional custom trigger
}

// Zod Schema for the unit form
const getUnitSchema = (t: (key: string, options?: { field?: string; count?: number }) => string) => z.object({
  name: z.string()
    .min(1, { message: t('common:validation.required', { field: t('labTests:units.nameLabel') }) })
    .max(20, { message: t('common:validation.maxLength', { field: t('labTests:units.nameLabel'), count: 20 }) }), // Max length from your 'units' table schema
});

type UnitFormValues = z.infer<ReturnType<typeof getUnitSchema>>;

const AddUnitDialog: React.FC<AddUnitDialogProps> = ({ onUnitAdded, triggerButton }) => {
  const { t } = useTranslation(['labTests', 'common']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const unitSchema = getUnitSchema(t);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: createUnit,
    onSuccess: (newUnit) => {
      toast.success(t('labTests:units.addedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['unitsList'] }); // Invalidate the list of units
      onUnitAdded(newUnit); // Call the callback to update parent form (e.g., select it)
      form.reset();
      setIsOpen(false); // Close the dialog
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || t('common:error.saveFailed', { entity: t('labTests:units.entityName', 'Unit')}));
    },
  });

  const onSubmit = (data: UnitFormValues) => {
    mutation.mutate({ name: data.name }); // Backend expects {name: string}
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
        form.reset({ name: '' });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button type="button" variant="outline" size="icon" className="ltr:ml-2 rtl:mr-2 shrink-0 h-9 w-9" aria-label={t('labTests:units.addButton')}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('labTests:units.addDialogTitle')}</DialogTitle>
          <DialogDescription>{t('labTests:units.addDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labTests:units.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('labTests:units.namePlaceholder')} {...field} disabled={mutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={mutation.isPending}>
                  {t('common:cancel')}
                </Button>
              </DialogClose>
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

export default AddUnitDialog;