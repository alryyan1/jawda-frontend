// src/components/specialists/ManageSpecialistDialog.tsx (New File)
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  Typography
} from '@mui/material';

import { createSpecialist, updateSpecialist } from '@/services/specialistService'; // Create this service file
import type { Specialist, SpecialistFormData } from '@/types/doctors'; // Add SpecialistFormData to types

interface ManageSpecialistDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  specialistToEdit: Specialist | null;
  onSuccess: () => void; // Callback to refetch list
}

const specialistSchema = z.object({
  name: z.string().min(1, { message: "اسم التخصص مطلوب" }).max(255),
});

const ManageSpecialistDialog: React.FC<ManageSpecialistDialogProps> = ({
  isOpen, onOpenChange, specialistToEdit, onSuccess
}) => {
  const isEditMode = !!specialistToEdit;

  const form = useForm<SpecialistFormData>({
    resolver: zodResolver(specialistSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ name: specialistToEdit?.name || '' });
    }
  }, [isOpen, specialistToEdit, form]);

  const mutation = useMutation({
    mutationFn: (data: SpecialistFormData) => {
      if (isEditMode) {
        return updateSpecialist(specialistToEdit!.id, data);
      }
      return createSpecialist(data);
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'تم تحديث التخصص بنجاح' : 'تم إنشاء التخصص بنجاح');
      onSuccess(); // Trigger parent's query invalidation
      onOpenChange(false); // Close dialog
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : 'فشل في حفظ البيانات';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: SpecialistFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      fullWidth
      dir="rtl"
    >
      <DialogTitle>
        {isEditMode ? 'تعديل التخصص' : 'إضافة تخصص جديد'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isEditMode ? 'قم بتعديل بيانات التخصص' : 'أدخل بيانات التخصص الجديد'}
        </Typography>
        <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ mt: 1 }}>
          <TextField
            {...form.register('name')}
            fullWidth
            label="اسم التخصص"
            placeholder="أدخل اسم التخصص"
            disabled={mutation.isPending}
            error={!!form.formState.errors.name}
            helperText={form.formState.errors.name?.message}
            sx={{ mb: 2 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => onOpenChange(false)} 
          disabled={mutation.isPending}
          variant="outlined"
        >
          إلغاء
        </Button>
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={mutation.isPending}
          variant="contained"
          startIcon={mutation.isPending ? <CircularProgress size={16} /> : null}
        >
          {mutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default ManageSpecialistDialog;