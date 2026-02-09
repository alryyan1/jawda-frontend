// src/components/services/AddSubServiceCostDialog.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
} from '@mui/material';

import { createSubServiceCost } from '@/services/subServiceCostService';
import type { SubServiceCost } from '@/types/services';

interface AddSubServiceCostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubServiceCostAdded: (newType: SubServiceCost) => void;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const subServiceCostSchema = z.object({
  name: z.string().min(1, { message: 'اسم نوع التكلفة مطلوب' }).max(255),
});

type SubServiceCostFormValues = z.infer<typeof subServiceCostSchema>;

const AddSubServiceCostDialog: React.FC<AddSubServiceCostDialogProps> = ({
  isOpen,
  onOpenChange,
  onSubServiceCostAdded,
}) => {
  const form = useForm<SubServiceCostFormValues>({
    resolver: zodResolver(subServiceCostSchema),
    defaultValues: { name: '' },
  });

  const mutation = useMutation({
    mutationFn: createSubServiceCost,
    onSuccess: (newSubType) => {
      toast.success('تمت إضافة نوع التكلفة بنجاح');
      onSubServiceCostAdded(newSubType);
      form.reset({ name: '' });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || 'فشل في إضافة نوع التكلفة');
    },
  });

  const onSubmit = (data: SubServiceCostFormValues) => mutation.mutate(data);

  useEffect(() => {
    if (!isOpen) {
      form.reset({ name: '' });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} maxWidth="xs" fullWidth>
      <DialogTitle>إضافة نوع تكلفة فرعي</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ pt: 1 }}>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                label="الاسم"
                placeholder="أدخل اسم نوع التكلفة"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={mutation.isPending}
                sx={{ mb: 2 }}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} disabled={mutation.isPending} variant="outlined">
          إلغاء
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={mutation.isPending}
          variant="contained"
          startIcon={mutation.isPending ? <CircularProgress size={16} /> : undefined}
        >
          {mutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSubServiceCostDialog;
