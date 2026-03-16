// src/components/doctors/AddSpecialistDialog.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  DialogClose, // Import DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, PlusCircle } from 'lucide-react';

import  { createSpecialist } from '@/services/doctorService'; // Or specialistService
import type { Specialist } from '@/types/doctors'; // Or types/specialists

interface AddSpecialistDialogProps {
  onSpecialistAdded: (newSpecialist: Specialist) => void; // Callback after successful add
  triggerButton?: React.ReactNode; // Optional custom trigger
}

const getSpecialistSchema = () => z.object({
  name: z.string().min(1, { message: 'اسم التخصص مطلوب' }),
});

type SpecialistFormValues = z.infer<ReturnType<typeof getSpecialistSchema>>;

const AddSpecialistDialog: React.FC<AddSpecialistDialogProps> = ({ onSpecialistAdded, triggerButton }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const specialistSchema = getSpecialistSchema();

  const form = useForm<SpecialistFormValues>({
    resolver: zodResolver(specialistSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: createSpecialist,
    onSuccess: (newSpecialist) => {
      toast.success('تم إضافة التخصص بنجاح');
      queryClient.invalidateQueries({ queryKey: ['specialistsList'] });
      onSpecialistAdded(newSpecialist); // Call the callback
      form.reset();
      setIsOpen(false); // Close the dialog
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إضافة التخصص');
    },
  });

  const onSubmit = (data: SpecialistFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button type="button" variant="outline" size="icon" className="ltr:ml-2 rtl:mr-2 shrink-0">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">إضافة تخصص</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>إضافة تخصص جديد</DialogTitle>
          <DialogDescription>أدخل اسم التخصص الجديد لإضافته إلى القائمة</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم التخصص</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل اسم التخصص" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={mutation.isPending}>
                  إلغاء
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                حفظ
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSpecialistDialog;