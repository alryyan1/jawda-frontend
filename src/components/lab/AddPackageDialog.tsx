// src/components/lab/AddPackageDialog.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // If container is a select
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';

import { createPackageQuick } from '@/services/packageService';
import { Package, PackageQuickAddFormData, Container } from '@/types/labTests';
// import { getContainersList } from '@/services/containerService'; // If container is a select

interface AddPackageDialogProps {
  onPackageAdded: (newPackage: Package) => void;
  triggerButton?: React.ReactNode;
}

const getPackageSchema = (t: Function) => z.object({
  package_name: z.string().min(1, { message: t('common:validation.required', { field: t('labPackages:form.nameLabel') }) }).max(50),
  container: z.string().min(1, { message: t('common:validation.required', { field: t('labPackages:form.containerLabelSimple') }) }).max(50), // If simple text input
  // container_id: z.string().min(1, { message: "Container is required"}), // If dropdown
  exp_time: z.string().min(1, "Required").refine(val => /^\d+$/.test(val), { message: t('common:validation.mustBeInteger') }),
});

type PackageFormValues = z.infer<ReturnType<typeof getPackageSchema>>;

const AddPackageDialog: React.FC<AddPackageDialogProps> = ({ onPackageAdded, triggerButton }) => {
  const { t, i18n } = useTranslation(['labPackages', 'common']); // New namespace 'labPackages'
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const packageSchema = getPackageSchema(t);
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: { package_name: '', container: '', exp_time: '0' },
  });

  // Example: If 'container' in packages table was a FK to 'containers' table
  // const { data: containers, isLoading: isLoadingContainers } = useQuery<Container[], Error>({
  //   queryKey: ['containersListForPackageDialog'],
  //   queryFn: getContainersList,
  //   enabled: isOpen,
  // });

  const mutation = useMutation({
    mutationFn: createPackageQuick,
    onSuccess: (newPackage) => {
      toast.success(t('labPackages:addedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['packagesList'] });
      onPackageAdded(newPackage);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:error.saveFailed', { entity: t('labPackages:entityName', 'Package')}));
    },
  });

  const onSubmit = (data: PackageFormValues) => mutation.mutate(data);
  useEffect(() => { if (!isOpen) form.reset(); }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button type="button" variant="outline" size="icon" className="ltr:ml-2 rtl:mr-2 shrink-0 h-9 w-9" aria-label={t('labPackages:addButton')}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('labPackages:addDialogTitle')}</DialogTitle>
          <DialogDescription>{t('labPackages:addDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="package_name" render={({ field }) => (
              <FormItem><FormLabel>{t('labPackages:form.nameLabel')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            {/* If container is a simple text input based on your schema */}
            <FormField control={form.control} name="container" render={({ field }) => (
              <FormItem><FormLabel>{t('labPackages:form.containerLabelSimple')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            {/* OR If container were a FK dropdown:
            <FormField control={form.control} name="container_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Container</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isLoadingContainers || mutation.isPending} dir={i18n.dir()}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select container..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {isLoadingContainers ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                     containers?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.container_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            */}
            <FormField control={form.control} name="exp_time" render={({ field }) => (
              <FormItem><FormLabel>{t('labPackages:form.expTimeLabel')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={mutation.isPending /*|| isLoadingContainers*/}>
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
export default AddPackageDialog;