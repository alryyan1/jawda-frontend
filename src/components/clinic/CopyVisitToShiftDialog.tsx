// src/components/clinic/CopyVisitToShiftDialog.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import type { DoctorShift } from '@/types/doctors'; // Assuming DoctorShift includes basic doctor info
import type { ActivePatientVisit } from '@/types/patients'; // From your ActivePatientCard
import { reassignDoctorVisitToShift } from '@/services/visitService'; // NEW SERVICE FUNCTION

interface CopyVisitToShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  visitToCopy: ActivePatientVisit;
  targetShiftOptions: DoctorShift[];
  isLoadingTargetShifts: boolean;
  onSuccess: () => void;
}

interface CopyFormValues {
  target_doctor_shift_id: string;
}

const CopyVisitToShiftDialog: React.FC<CopyVisitToShiftDialogProps> = ({
  isOpen, onOpenChange, visitToCopy, targetShiftOptions, isLoadingTargetShifts, onSuccess
}) => {
  const form = useForm<CopyFormValues>({
    defaultValues: { target_doctor_shift_id: '' },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const mutation = useMutation({
    mutationFn: (data: { visitId: number, targetDoctorShiftId: number }) => 
        reassignDoctorVisitToShift(data.visitId, data.targetDoctorShiftId),
    onSuccess: () => {
      onSuccess(); // Parent handles toast and invalidation
      form.reset();
      // onOpenChange(false); // Parent handles closing
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "فشل في العملية");
    },
  });

  const onSubmit = (data: CopyFormValues) => {
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
        visitId: visitToCopy.id, 
        targetDoctorShiftId: targetShiftId 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
      <DialogContent 
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          // Focus the select trigger when the dialog opens
          const selectTrigger = document.querySelector('[data-testid="shift-select-trigger"]');
          if (selectTrigger instanceof HTMLElement) {
            selectTrigger.focus();
          }
        }}
        onEscapeKeyDown={() => onOpenChange(false)}
        onPointerDownOutside={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>نسخ زيارة {visitToCopy.patient.name} إلى نوبة أخرى</DialogTitle>
          <DialogDescription>اختر النوبة التي تريد نسخ هذه الزيارة إليها</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="target_doctor_shift_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اختر النوبة المستهدفة</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    dir={true} 
                    disabled={isLoadingTargetShifts || mutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="shift-select-trigger">
                        <SelectValue placeholder="اختر النوبة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingTargetShifts ? (
                        <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                      ) : targetShiftOptions.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">لا توجد نوبات أخرى متاحة</div>
                      ) : (
                        targetShiftOptions.map(ds => (
                          <SelectItem key={ds.id} value={String(ds.id)}>
                            {ds.doctor_name} (النوبة #{ds.id} - {ds.status ? "مفتوحة" : "مغلقة"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>إلغاء</Button></DialogClose>
              <Button type="submit" disabled={isLoadingTargetShifts || mutation.isPending || targetShiftOptions.length === 0}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                نسخ الزيارة
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CopyVisitToShiftDialog;