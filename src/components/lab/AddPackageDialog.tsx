// src/components/lab/AddPackageDialog.tsx
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Stack
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { FormProvider } from 'react-hook-form';

import { createPackageQuick } from '@/services/packageService';
import { Package, PackageQuickAddFormData, Container } from '@/types/labTests';
// import { getContainersList } from '@/services/containerService'; // If container is a select

interface AddPackageDialogProps {
  onPackageAdded: (newPackage: Package) => void;
  triggerButton?: React.ReactNode;
}

const packageSchema = z.object({
  package_name: z.string().min(1, { message: 'اسم الحزمة مطلوب' }).max(50, { message: 'اسم الحزمة يجب أن يكون أقل من 50 حرف' }),
  container: z.string().min(1, { message: 'الوعاء مطلوب' }).max(50, { message: 'اسم الوعاء يجب أن يكون أقل من 50 حرف' }),
  exp_time: z.string().min(1, 'وقت الانتهاء مطلوب').refine(val => /^\d+$/.test(val), { message: 'وقت الانتهاء يجب أن يكون رقماً صحيحاً' }),
});

type PackageFormValues = z.infer<typeof packageSchema>;

const AddPackageDialog: React.FC<AddPackageDialogProps> = ({ onPackageAdded, triggerButton }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

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
      toast.success('تم إضافة الحزمة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['packagesList'] });
      onPackageAdded(newPackage);
      form.reset();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في حفظ البيانات');
    },
  });

  const onSubmit = (data: PackageFormValues) => mutation.mutate(data);
  useEffect(() => { if (!isOpen) form.reset(); }, [isOpen, form]);

  return (
    <>
      {triggerButton ? (
        <Box onClick={() => setIsOpen(true)}>
          {triggerButton}
        </Box>
      ) : (
        <IconButton
          onClick={() => setIsOpen(true)}
          size="small"
          sx={{ 
            ml: { ltr: 1, rtl: 0 },
            mr: { ltr: 0, rtl: 1 },
            width: 36,
            height: 36
          }}
        >
          <Add fontSize="small" />
        </IconButton>
      )}
      
      <Dialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          إضافة حزمة جديدة
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            أدخل تفاصيل الحزمة الجديدة
          </Typography>
          
          <FormProvider {...form}>
            <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                <Controller
                  control={form.control}
                  name="package_name"
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="اسم الحزمة"
                      placeholder="أدخل اسم الحزمة"
                      disabled={mutation.isPending}
                      error={!!error}
                      helperText={error?.message}
                      fullWidth
                      autoFocus
                    />
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="container"
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="الوعاء"
                      placeholder="أدخل اسم الوعاء"
                      disabled={mutation.isPending}
                      error={!!error}
                      helperText={error?.message}
                      fullWidth
                    />
                  )}
                />
                
                <Controller
                  control={form.control}
                  name="exp_time"
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="وقت الانتهاء (بالساعات)"
                      type="number"
                      placeholder="أدخل وقت الانتهاء"
                      disabled={mutation.isPending}
                      error={!!error}
                      helperText={error?.message}
                      fullWidth
                    />
                  )}
                />
              </Stack>
            </Box>
          </FormProvider>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setIsOpen(false)}
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
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default AddPackageDialog;