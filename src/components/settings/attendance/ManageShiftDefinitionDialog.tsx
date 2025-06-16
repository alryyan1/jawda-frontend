// src/components/settings/attendance/ManageShiftDefinitionDialog.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker'; // Import your TimePicker
import apiClient from '@/services/api';
import type { ShiftDefinition } from '@/types/attendance';

interface ManageShiftDefinitionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shiftDefinition: ShiftDefinition | null; // Pass null for "add" mode
  onSuccess: () => void; // Callback on successful save
}

const getShiftDefinitionSchema = (t: any) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('attendance:shiftDefinitions.dialog.nameLabel')}) }).max(255),
  shift_label: z.string().min(1, { message: t('common:validation.required', { field: t('attendance:shiftDefinitions.dialog.labelLabel')}) }).max(50),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: t('common:validation.invalidTimeFormat')}),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: t('common:validation.invalidTimeFormat')}),
  is_active: z.boolean(),
});
// Add .refine for start_time < end_time if needed, considering overnight shifts.

type ShiftDefinitionFormValues = z.infer<ReturnType<typeof getShiftDefinitionSchema>>;

const ManageShiftDefinitionDialog: React.FC<ManageShiftDefinitionDialogProps> = ({
  isOpen, onOpenChange, shiftDefinition, onSuccess
}) => {
  const { t } = useTranslation(['attendance', 'common']);
  const isEditMode = !!shiftDefinition;
  const formSchema = getShiftDefinitionSchema(t);

  const form = useForm<ShiftDefinitionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      shift_label: '',
      start_time: '08:00',
      end_time: '16:00',
      is_active: true,
    },
  });

  useEffect(() => {
    if (shiftDefinition && isOpen) {
      form.reset({
        name: shiftDefinition.name,
        shift_label: shiftDefinition.shift_label,
        start_time: shiftDefinition.start_time, // Assuming "HH:mm" format from backend
        end_time: shiftDefinition.end_time,
        is_active: shiftDefinition.is_active,
      });
    } else if (!isOpen) {
      form.reset();
    }
  }, [shiftDefinition, isOpen, form]);

  const mutation = useMutation({
    mutationFn: (data: ShiftDefinitionFormValues) => {
      const payload = { ...data };
      if (isEditMode && shiftDefinition) {
        return apiClient.put(`/shifts-definitions/${shiftDefinition.id}`, payload);
      }
      return apiClient.post('/shifts-definitions', payload);
    },
    onSuccess: () => {
      toast.success(isEditMode ? t('attendance:shiftDefinitions.updatedSuccess') : t('attendance:shiftDefinitions.createdSuccess'));
      onSuccess(); // This will invalidate query and close dialog from parent
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('common:error.saveFailed')),
  });

  const onSubmit = (data: ShiftDefinitionFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('attendance:shiftDefinitions.dialog.editTitle') : t('attendance:shiftDefinitions.dialog.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>{t('attendance:shiftDefinitions.dialog.nameLabel')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="shift_label" render={({ field }) => (
              <FormItem><FormLabel>{t('attendance:shiftDefinitions.dialog.labelLabel')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_time" render={({ field }) => (
                <FormItem><FormLabel>{t('attendance:shiftDefinitions.dialog.startTimeLabel')}</FormLabel><FormControl><TimePicker id="start-time" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="end_time" render={({ field }) => (
                <FormItem><FormLabel>{t('attendance:shiftDefinitions.dialog.endTimeLabel')}</FormLabel><FormControl><TimePicker id="end-time" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>{t('attendance:shiftDefinitions.dialog.isActiveLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )}/>
            <DialogFooter className="pt-3">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t(isEditMode ? 'common:saveChanges' : 'common:create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ManageShiftDefinitionDialog;