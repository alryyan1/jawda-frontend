// src/components/lab/AddUnitDialog.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { toast } from 'sonner';

import type { Unit } from '@/types/labTests';
import { createUnit } from '@/services/unitService';

const unitFormSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(50, 'بحد أقصى 50 حرفاً'),
  description: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;

interface AddUnitDialogProps {
  onUnitAdded: (unit: Unit) => void;
  triggerButton?: React.ReactNode;
}

const AddUnitDialog: React.FC<AddUnitDialogProps> = ({ onUnitAdded, triggerButton }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  });

  const { handleSubmit, register, reset, formState: { errors, isSubmitting } } = form;

  const createUnitMutation = useMutation<Unit, Error, UnitFormValues>({
    mutationFn: createUnit,
    onSuccess: (newUnit) => {
      onUnitAdded(newUnit);
      setIsOpen(false);
      reset();
    },
    onError: () => {
      toast.error('فشل الحفظ');
    }
  });

  const onSubmit = (data: UnitFormValues) => {
    createUnitMutation.mutate(data);
  };

  const openTrigger = React.useMemo(() => {
    if (!triggerButton) {
      return (
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setIsOpen(true)}>
          إضافة وحدة
        </Button>
      );
    }
    if (React.isValidElement(triggerButton)) {
      return React.cloneElement(triggerButton as React.ReactElement<any>, {
        onClick: (e: any) => {
          if (typeof (triggerButton as any)?.props?.onClick === 'function') {
            (triggerButton as any).props.onClick(e);
          }
          setIsOpen(true);
        }
      });
    }
    return (
      <span onClick={() => setIsOpen(true)} style={{ display: 'inline-block' }}>{triggerButton}</span>
    );
  }, [triggerButton]);

  return (
    <>
      {openTrigger}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة وحدة جديدة</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'grid', gap: 2 }}>
          <form id="add-unit-form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="الاسم"
              placeholder="اكتب اسم الوحدة"
              fullWidth
              size="small"
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              label="الوصف (اختياري)"
              placeholder="أدخل وصفاً مختصراً"
              fullWidth
              size="small"
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
              sx={{ mt: 2 }}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)} variant="outlined" disabled={createUnitMutation.isPending}>
            إلغاء
          </Button>
          <Button type="submit" form="add-unit-form" variant="contained" disabled={createUnitMutation.isPending}>
            {createUnitMutation.isPending && (
              <CircularProgress size={18} sx={{ mr: 1 }} />
            )}
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddUnitDialog;