// src/components/settings/service_groups/ManageServiceGroupDialog.tsx (New file)
import React, { useEffect } from 'react';
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

import type { ServiceGroup } from '@/types/services';
import { createServiceGroup, updateServiceGroup, type ServiceGroupFormData } from '@/services/serviceGroupService';

interface ManageServiceGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  serviceGroup?: ServiceGroup | null; // For editing
  onSuccess?: () => void;
}

const getServiceGroupSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('common:validation.requiredField', { field: t('settings:serviceGroups.nameLabel')}) }).max(255),
});

type ServiceGroupFormValues = z.infer<ReturnType<typeof getServiceGroupSchema>>;

const ManageServiceGroupDialog: React.FC<ManageServiceGroupDialogProps> = ({
  isOpen, onOpenChange, serviceGroup, onSuccess
}) => {
  const { t } = useTranslation(['settings', 'common']);
  const queryClient = useQueryClient();
  const isEditMode = !!serviceGroup;

  const serviceGroupSchema = getServiceGroupSchema(t);
  const form = useForm<ServiceGroupFormValues>({
    resolver: zodResolver(serviceGroupSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && serviceGroup) {
        form.reset({ name: serviceGroup.name });
      } else {
        form.reset({ name: '' });
      }
    }
  }, [isOpen, isEditMode, serviceGroup, form]);

  const mutation = useMutation({
    mutationFn: (data: ServiceGroupFormData) => 
      isEditMode && serviceGroup?.id ? updateServiceGroup(serviceGroup.id, data) : createServiceGroup(data),
    onSuccess: () => {
      toast.success(isEditMode ? t('settings:serviceGroups.updatedSuccess') : t('settings:serviceGroups.createdSuccess'));
      queryClient.invalidateQueries({ queryKey: ['serviceGroupsPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['allServiceGroupsList'] }); // For dropdowns
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:error.saveFailed'));
    },
  });

  const onSubmit = (data: ServiceGroupFormValues) => mutation.mutate(data);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('settings:serviceGroups.editTitle') : t('settings:serviceGroups.createTitle')}</DialogTitle>
          <DialogDescription>{t('common:form.fillDetails')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings:serviceGroups.nameLabel')}</FormLabel>
                  <FormControl><Input {...field} disabled={mutation.isPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Add other fields for ServiceGroup here if any */}
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {isEditMode ? t('common:saveChanges') : t('common:create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ManageServiceGroupDialog;