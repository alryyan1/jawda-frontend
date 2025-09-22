// MUI version with Arabic labels
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@mui/material';
import type { ServiceGroup } from '@/types/services';
import { createServiceGroup, updateServiceGroup, type ServiceGroupFormData } from '@/services/serviceGroupService';

interface ManageServiceGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  serviceGroup?: ServiceGroup | null;
  onSuccess?: () => void;
}

type ServiceGroupFormValues = { name: string };

const ManageServiceGroupDialog: React.FC<ManageServiceGroupDialogProps> = ({ isOpen, onOpenChange, serviceGroup, onSuccess }) => {
  const queryClient = useQueryClient();
  const isEditMode = !!serviceGroup;

  const { control, handleSubmit, reset } = useForm<ServiceGroupFormValues>({
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({ name: serviceGroup?.name ?? '' });
  }, [isOpen, serviceGroup, reset]);

  const mutation = useMutation({
    mutationFn: (data: ServiceGroupFormData) =>
      isEditMode && serviceGroup?.id ? updateServiceGroup(serviceGroup.id, data) : createServiceGroup(data),
    onSuccess: () => {
      toast.success(isEditMode ? 'تم تحديث المجموعة بنجاح' : 'تم إنشاء المجموعة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['serviceGroupsPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['allServiceGroupsList'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل الحفظ');
    },
  });

  const onSubmit = (data: ServiceGroupFormValues) => {
    if (!data.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    mutation.mutate({ name: data.name } as ServiceGroupFormData);
  };

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="xs">
      <DialogTitle>{isEditMode ? 'تعديل مجموعة خدمات' : 'إضافة مجموعة خدمات'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }}>
          <Controller name="name" control={control} rules={{ required: 'الاسم مطلوب' }} render={({ field, fieldState }) => (
            <TextField fullWidth label="اسم المجموعة" placeholder="اسم المجموعة" {...field} disabled={mutation.isPending} error={!!fieldState.error} helperText={fieldState.error?.message} />
          )} />
          <DialogActions sx={{ px: 0, pt: 2 }}>
            <Button type="button" variant="outlined" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>إلغاء</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending} startIcon={mutation.isPending ? <CircularProgress size={16} /> : undefined}>
              {isEditMode ? 'حفظ التغييرات' : 'إنشاء'}
            </Button>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ManageServiceGroupDialog;