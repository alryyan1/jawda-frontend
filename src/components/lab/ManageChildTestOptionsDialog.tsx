// src/components/lab/ManageChildTestOptionsDialog.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';

import type { ChildTest, ChildTestOption } from '@/types/labTests';
import { getChildTestOptionsList, createChildTestOption, updateChildTestOption, deleteChildTestOption } from '@/services/childTestOptionService';

interface ManageChildTestOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  childTest: ChildTest | null;
}

const optionSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('common:validation.required')).max(255)
});

type OptionFormValues = z.infer<ReturnType<typeof optionSchema>>;

const ManageChildTestOptionsDialog: React.FC<ManageChildTestOptionsDialogProps> = ({ isOpen, onOpenChange, childTest }) => {
  const { t } = useTranslation(['labTests', 'common']);
  const queryClient = useQueryClient();
  const [editingOption, setEditingOption] = useState<ChildTestOption | null>(null);

  const optionsQueryKey = ['childTestOptions', childTest?.id];
  const { data: options = [], isLoading } = useQuery<ChildTestOption[]>({
    queryKey: optionsQueryKey,
    queryFn: () => childTest ? getChildTestOptionsList(childTest.id!) : Promise.resolve([]),
    enabled: !!childTest && isOpen,
  });

  const form = useForm<OptionFormValues>({
    resolver: zodResolver(optionSchema(t)),
    defaultValues: { name: '' }
  });

  const createMutation = useMutation({
    mutationFn: ({ childTestId, data }: { childTestId: number; data: OptionFormValues }) => 
      createChildTestOption(childTestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionsQueryKey });
      form.reset();
      toast.success(t('labTests:childTests.options.addedSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('labTests:childTests.options.addError'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ optionId, data }: { optionId: number; data: OptionFormValues }) =>
      updateChildTestOption(optionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionsQueryKey });
      form.reset();
      setEditingOption(null);
      toast.success(t('labTests:childTests.options.updatedSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('labTests:childTests.options.updateError'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (optionId: number) => deleteChildTestOption(optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: optionsQueryKey });
      toast.success(t('labTests:childTests.options.deletedSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('labTests:childTests.options.deleteError'));
    }
  });

  const handleSaveOption = (data: OptionFormValues) => {
    if (!childTest) return;
    if (editingOption) {
      updateMutation.mutate({ optionId: editingOption.id, data });
    } else {
      createMutation.mutate({ childTestId: childTest.id!, data });
    }
  };

  const handleEditOption = (option: ChildTestOption) => {
    setEditingOption(option);
    form.setValue('name', option.name);
  };

  const handleDeleteOption = (optionId: number) => {
    if (window.confirm(t('labTests:childTests.options.confirmDelete'))) {
      deleteMutation.mutate(optionId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('labTests:childTests.options.dialogTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveOption)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input {...field} placeholder={t('labTests:childTests.options.namePlaceholder')} />
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {(createMutation.isPending || updateMutation.isPending) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : editingOption ? (
                          <Edit className="h-4 w-4" />
                        ) : (
                          <PlusCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : options.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            {t('labTests:childTests.options.noOptions')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('labTests:childTests.options.nameColumn')}</TableHead>
                <TableHead className="w-[100px]">{t('common:actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((option) => (
                <TableRow key={option.id}>
                  <TableCell>{option.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditOption(option)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteOption(option.id)}
                        className="h-8 w-8 text-destructive"
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageChildTestOptionsDialog;