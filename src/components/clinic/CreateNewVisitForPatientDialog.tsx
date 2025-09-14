// src/components/clinic/CreateNewVisitForPatientDialog.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
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

interface CreateNewVisitFormValues {
  target_doctor_shift_id: string;
  reason_for_visit?: string;
}

const CreateNewVisitForPatientDialog: React.FC<CreateNewVisitForPatientDialogProps> = ({
  isOpen, onOpenChange, sourcePatient, targetShiftOptions, isLoadingTargetShifts, onSuccess
}) => {
  const form = useForm<CreateNewVisitFormValues>({
    defaultValues: { target_doctor_shift_id: '', reason_for_visit: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateCopiedVisitPayload) => 
        createCopiedVisitForNewShift(data),
    onSuccess: () => {
      onSuccess(); // Parent handles toast and invalidation for the main list
      form.reset();
      // onOpenChange(false); // Parent typically handles closing
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل في العملية");
    },
  });

  const onSubmit = (data: CreateNewVisitFormValues) => {
    // Basic validation
    if (!data.target_doctor_shift_id) {
      toast.error("النوبة المستهدفة مطلوبة");
      return;
    }
    
    const targetShiftId = parseInt(data.target_doctor_shift_id);
    if (isNaN(targetShiftId)) {
      toast.error("معرف النوبة غير صحيح");
      return;
    }
    
    mutation.mutate({ 
        target_doctor_shift_id: targetShiftId,
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
          <DialogTitle>إنشاء زيارة جديدة للمريض {sourcePatient.name}</DialogTitle>
          <DialogDescription>إنشاء زيارة جديدة للمريض في نوبة أخرى</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="target_doctor_shift_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اختر النوبة المستهدفة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} dir={true} disabled={isLoadingTargetShifts || mutation.isPending}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر النوبة" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {isLoadingTargetShifts ? <SelectItem value="loading" disabled>جاري التحميل...</SelectItem> :
                       targetShiftOptions.length === 0 ? <div className="p-2 text-xs text-muted-foreground">لا توجد نوبات أخرى متاحة</div> :
                       targetShiftOptions.map(ds => (
                        <SelectItem key={ds.id} value={String(ds.id)}>
                          {ds.doctor_name} (النوبة #{ds.id} - {ds.status ? "مفتوحة" : "مغلقة"})
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
                  <FormLabel>سبب الزيارة</FormLabel>
                  <FormControl><Textarea {...field} placeholder="اكتب سبب الزيارة..." rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>إلغاء</Button></DialogClose>
              <Button type="submit" disabled={isLoadingTargetShifts || mutation.isPending || targetShiftOptions.length === 0}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                إنشاء الزيارة
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CreateNewVisitForPatientDialog;