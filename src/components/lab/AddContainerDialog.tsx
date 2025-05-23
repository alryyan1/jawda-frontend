// src/components/lab/AddContainerDialog.tsx
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

import { createContainer, type CreateContainerData } from '@/services/containerService';
import type { Container } from '@/types/labTests';

interface AddContainerDialogProps {
  onContainerAdded: (newContainer: Container) => void;
  triggerButton?: React.ReactNode;
}

const getContainerSchema = (t: (key: string, options?: { field?: string; count?: number }) => string) => z.object({
  container_name: z.string().min(1, { message: t('common:validation.required', { field: t('labTests:containers.nameLabel') }) })
                  .max(50, { message: t('common:validation.maxLength', { field: t('labTests:containers.nameLabel'), count: 50 }) }),
});

type ContainerFormValues = CreateContainerData;

const AddContainerDialog: React.FC<AddContainerDialogProps> = ({ onContainerAdded, triggerButton }) => {
  const { t } = useTranslation(['labTests', 'common']);
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const containerSchema = getContainerSchema(t);

  const form = useForm<ContainerFormValues>({
    resolver: zodResolver(containerSchema),
    defaultValues: { container_name: '' },
  });

  const mutation = useMutation({
    mutationFn: createContainer,
    onSuccess: (newContainer: Container) => {
      toast.success(t('labTests:containers.addedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['containersList'] });
      onContainerAdded(newContainer);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || t('common:error.saveFailed', { entity: t('labTests:containers.entityName', 'Container')}));
    },
  });

  const onSubmit = (data: ContainerFormValues) => {
    mutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset({ container_name: '' });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button type="button" variant="outline" size="icon" className="ltr:ml-2 rtl:mr-2 shrink-0 h-9 w-9">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">{t('labTests:containers.addButton')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('labTests:containers.addDialogTitle')}</DialogTitle>
          <DialogDescription>{t('labTests:containers.addDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="container_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labTests:containers.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('labTests:containers.namePlaceholder')} {...field} disabled={mutation.isPending} />
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

export default AddContainerDialog;