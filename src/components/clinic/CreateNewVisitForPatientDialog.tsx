// src/components/clinic/CreateNewVisitForPatientDialog.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea'; // For reason for visit
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

import type { DoctorShift } from '@/types/doctors';
import type { Patient } from '@/types/patients';
import { createCopiedVisitForNewShift, type CreateCopiedVisitPayload } from '@/services/patientService';

interface CreateNewVisitForPatientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePatient: Patient; // The patient whose info is being "copied"
  targetShiftOptions: DoctorShift[];
  isLoadingTargetShifts: boolean;
  onSuccess: () => void; // Callback on successful creation
}

const createNewVisitSchema = z.object({
  target_doctor_shift_id: z.string().min(1, "Target shift is required."),
  reason_for_visit: z.string().max(1000).optional(),
});
type CreateNewVisitFormValues = z.infer<typeof createNewVisitSchema>;

const CreateNewVisitForPatientDialog: React.FC<CreateNewVisitForPatientDialogProps> = ({
  isOpen, onOpenChange, sourcePatient, targetShiftOptions, isLoadingTargetShifts, onSuccess
}) => {
  const { t, i18n } = useTranslation(['clinic', 'common']);

  const form = useForm<CreateNewVisitFormValues>({
    resolver: zodResolver(createNewVisitSchema),
    defaultValues: { target_doctor_shift_id: '', reason_for_visit: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateCopiedVisitPayload) => 
        createCopiedVisitForNewShift(sourcePatient.id, data),
    onSuccess: () => {
      onSuccess(); // Parent handles toast and invalidation for the main list
      form.reset();
      // onOpenChange(false); // Parent typically handles closing
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('common:error.operationFailed'));
    },
  });

  const onSubmit = (data: CreateNewVisitFormValues) => {
    mutation.mutate({ 
        target_doctor_shift_id: parseInt(data.target_doctor_shift_id),
        reason_for_visit: data.reason_for_visit
    });
  };
  
  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('clinic:visit.createNewVisitDialog.title', { patientName: sourcePatient.name })}</DialogTitle>
          <DialogDescription>{t('clinic:visit.createNewVisitDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="target_doctor_shift_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('clinic:visit.createNewVisitDialog.selectTargetShift')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} dir={i18n.dir()} disabled={isLoadingTargetShifts || mutation.isPending}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('clinic:visit.createNewVisitDialog.targetShiftPlaceholder')} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingTargetShifts ? <SelectItem value="loading" disabled>{t('common:loading')}</SelectItem> :
                       targetShiftOptions.length === 0 ? <div className="p-2 text-xs text-muted-foreground">{t('clinic:visit.copyDialog.noOtherShifts')}</div> :
                       targetShiftOptions.map(ds => (
                        <SelectItem key={ds.id} value={String(ds.id)}>
                          {ds.doctor_name} ({t('common:shift')} #{ds.id} - {ds.status ? t('common:statusEnum.open') : t('common:statusEnum.closed')})
                        </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason_for_visit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('clinic:visit.createNewVisitDialog.reasonLabel')}</FormLabel>
                  <FormControl><Textarea {...field} placeholder={t('clinic:visit.createNewVisitDialog.reasonPlaceholder')} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>{t('common:cancel')}</Button></DialogClose>
              <Button type="submit" disabled={isLoadingTargetShifts || mutation.isPending || targetShiftOptions.length === 0}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                {t('clinic:visit.createNewVisitDialog.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CreateNewVisitForPatientDialog;