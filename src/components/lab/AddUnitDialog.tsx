// src/components/lab/AddUnitDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import type { Unit } from '@/types/labTests';
import { createUnit } from '@/services/unitService';

const unitFormSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface AddUnitDialogProps {
  onUnitAdded: (unit: Unit) => void;
  triggerButton?: React.ReactNode;
}

interface UnitResponse {
  data: Unit;
}

const AddUnitDialog: React.FC<AddUnitDialogProps> = ({ onUnitAdded, triggerButton }) => {
  const { t } = useTranslation(['labTests', 'common']);
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const { handleSubmit, control, reset } = form;

  const createUnitMutation = useMutation<Unit, Error, UnitFormValues>({
    mutationFn: createUnit,
    onSuccess: (newUnit) => {
      onUnitAdded(newUnit);
      setIsOpen(false);
      reset();
    },
    onError: () => {
      toast.error(t('common:errors.saveFailed'));
    }
  });

  const onSubmit = (data: UnitFormValues) => {
    createUnitMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title={t('labTests:units.addNew')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('labTests:units.addNew')}</DialogTitle>
          <DialogDescription>{t('labTests:units.addDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labTests:units.form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={createUnitMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labTests:units.form.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={createUnitMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={createUnitMutation.isPending}
              >
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={createUnitMutation.isPending}>
                {createUnitMutation.isPending && (
                  <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
                )}
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