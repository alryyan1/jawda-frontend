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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';

import { createChildGroup, type CreateChildGroupData } from '@/services/childGroupService';
import type { ChildGroup } from '@/types/labTests';

interface AddChildGroupDialogProps {
  onChildGroupAdded: (newGroup: ChildGroup) => void;
  triggerButton?: React.ReactNode;
}

const getChildGroupSchema = (t: (key: string, options?: { field?: string; count?: number }) => string) => z.object({
  name: z.string().min(1, { message: t('common:validation.required', { field: t('labTests:childGroups.nameLabel') }) })
        .max(50, { message: t('common:validation.maxLength', { field: t('labTests:childGroups.nameLabel'), count: 50 }) }),
});

type ChildGroupFormValues = CreateChildGroupData;

const AddChildGroupDialog: React.FC<AddChildGroupDialogProps> = ({ onChildGroupAdded, triggerButton }) => {
  const { t } = useTranslation(['labTests', 'common']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const childGroupSchema = getChildGroupSchema(t);

  const form = useForm<ChildGroupFormValues>({
    resolver: zodResolver(childGroupSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: createChildGroup,
    onSuccess: (newGroup: ChildGroup) => {
      toast.success(t('labTests:childGroups.addedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['childGroupsList'] });
      onChildGroupAdded(newGroup);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || t('common:error.saveFailed', { entity: t('labTests:childGroups.entityName', 'Child Group')}));
    },
  });

  const onSubmit = (data: ChildGroupFormValues) => {
    mutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset({ name: '' });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button type="button" variant="outline" size="icon" className="ltr:ml-2 rtl:mr-2 shrink-0 h-9 w-9">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">{t('labTests:childGroups.addButton')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('labTests:childGroups.addDialogTitle')}</DialogTitle>
          <DialogDescription>{t('labTests:childGroups.addDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labTests:childGroups.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('labTests:childGroups.namePlaceholder')} {...field} disabled={mutation.isPending} />
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

export default AddChildGroupDialog; 