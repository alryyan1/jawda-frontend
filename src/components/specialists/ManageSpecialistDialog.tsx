// src/components/specialists/ManageSpecialistDialog.tsx (New File)
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

import { createSpecialist, updateSpecialist } from '@/services/specialistService'; // Create this service file
import type { Specialist, SpecialistFormData } from '@/types/doctors'; // Add SpecialistFormData to types

interface ManageSpecialistDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  specialistToEdit: Specialist | null;
  onSuccess: () => void; // Callback to refetch list
}

const specialistSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }).max(255),
});

const ManageSpecialistDialog: React.FC<ManageSpecialistDialogProps> = ({
  isOpen, onOpenChange, specialistToEdit, onSuccess
}) => {
  const { t } = useTranslation(['specialists', 'common']);
  const isEditMode = !!specialistToEdit;

  const form = useForm<SpecialistFormData>({
    resolver: zodResolver(specialistSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ name: specialistToEdit?.name || '' });
    }
  }, [isOpen, specialistToEdit, form.reset]);

  const mutation = useMutation({
    mutationFn: (data: SpecialistFormData) => {
      if (isEditMode) {
        return updateSpecialist(specialistToEdit!.id, data);
      }
      return createSpecialist(data);
    },
    onSuccess: () => {
      toast.success(isEditMode ? t('editSuccess') : t('createSuccess'));
      onSuccess(); // Trigger parent's query invalidation
      onOpenChange(false); // Close dialog
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:error.saveFailed'));
    },
  });

  const onSubmit = (data: SpecialistFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('editDialogTitle') : t('createDialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('form.namePlaceholder')} disabled={mutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
                {t('common:saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ManageSpecialistDialog;