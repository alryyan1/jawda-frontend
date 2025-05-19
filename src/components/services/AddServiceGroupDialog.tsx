// src/components/services/AddServiceGroupDialog.tsx
import React, { useState } from 'react';
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

import { createServiceGroup } from '@/services/serviceGroupService';
import type { ServiceGroup } from '@/types/services';

interface AddServiceGroupDialogProps {
  onServiceGroupAdded: (newGroup: ServiceGroup) => void;
  triggerButton?: React.ReactNode;
}

const getServiceGroupSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('serviceGroups:form.nameLabel') }) }),
});

type ServiceGroupFormValues = z.infer<ReturnType<typeof getServiceGroupSchema>>;

const AddServiceGroupDialog: React.FC<AddServiceGroupDialogProps> = ({ onServiceGroupAdded, triggerButton }) => {
  const { t } = useTranslation(['serviceGroups', 'common']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const serviceGroupSchema = getServiceGroupSchema(t);
  const form = useForm<ServiceGroupFormValues>({
    resolver: zodResolver(serviceGroupSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: createServiceGroup,
    onSuccess: (newGroup) => {
      toast.success(t('serviceGroups:addSuccess'));
      queryClient.invalidateQueries({ queryKey: ['serviceGroupsList'] });
      onServiceGroupAdded(newGroup);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('serviceGroups:addError'));
    },
  });

  const onSubmit = (data: ServiceGroupFormValues) => mutation.mutate(data);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button type="button" variant="outline" size="icon" className="ltr:ml-2 rtl:mr-2 shrink-0">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">{t('serviceGroups:addServiceGroupButton')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('serviceGroups:addDialogTitle')}</DialogTitle>
          <DialogDescription>{t('serviceGroups:addDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('serviceGroups:form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('serviceGroups:form.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
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
export default AddServiceGroupDialog;