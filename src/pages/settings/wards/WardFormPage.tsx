import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import { Loader2 } from 'lucide-react';
import type { WardFormData, Ward } from '@/types/admissions';
import { createWard, updateWard, getWardById } from '@/services/wardService';

export const WardFormMode = {
  CREATE: 'create',
  EDIT: 'edit'
} as const;

type WardFormValues = {
  name: string;
  description: string;
  status: boolean;
};

const WardFormPage: React.FC<{ mode: typeof WardFormMode[keyof typeof WardFormMode] }> = ({ mode }) => {
  const navigate = useNavigate();
  const { wardId } = useParams<{ wardId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === WardFormMode.EDIT;

  const { data: wardData, isLoading: isLoadingWard } = useQuery({
    queryKey: ['ward', wardId],
    queryFn: () => getWardById(Number(wardId)).then(res => res.data as Ward),
    enabled: isEditMode && !!wardId,
  });

  const form = useForm<WardFormValues>({
    defaultValues: {
      name: '',
      description: '',
      status: true,
    },
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (isEditMode && wardData) {
      reset({
        name: wardData.name ?? '',
        description: wardData.description ?? '',
        status: Boolean(wardData.status),
      });
    }
  }, [isEditMode, wardData, reset]);

  const mutation = useMutation({
    mutationFn: (data: WardFormData) =>
      isEditMode && wardId ? updateWard(Number(wardId), data) : createWard(data),
    onSuccess: () => {
      toast.success('تم حفظ بيانات القسم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['wards'] });
      if (isEditMode && wardId) queryClient.invalidateQueries({ queryKey: ['ward', wardId] });
      navigate('/settings/wards');
    },
    onError: (error: any) => {
      let msg = 'فشل حفظ بيانات القسم';
      if (error.response?.data?.errors) {
        const fieldErrors = Object.values(error.response.data.errors).flat().join(' ');
        msg = `${msg}${fieldErrors ? `: ${fieldErrors}` : ''}`;
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      toast.error(msg);
    },
  });

  const onSubmit = (data: WardFormValues) => {
    if (!data.name.trim()) return toast.error('الاسم مطلوب');

    const submissionData: WardFormData = {
      name: data.name,
      description: data.description || null,
      status: Boolean(data.status),
    };

    mutation.mutate(submissionData);
  };

  const formIsSubmitting = mutation.isPending;
  const dataIsLoading = isLoadingWard;

  if (isEditMode && isLoadingWard) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="rtl:ml-2 ltr:mr-2">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <Typography variant="h5">{isEditMode ? 'تعديل قسم' : 'إضافة قسم'}</Typography>
        <Typography variant="body2" color="text.secondary">يرجى تعبئة الحقول التالية</Typography>
      </CardHeader>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller name="name" control={control} rules={{ required: 'الاسم مطلوب' }} render={({ field, fieldState }) => (
            <TextField fullWidth label="اسم القسم" placeholder="اسم القسم" {...field} disabled={dataIsLoading || formIsSubmitting} error={!!fieldState.error} helperText={fieldState.error?.message} />
          )} />

          <Controller name="description" control={control} render={({ field }) => (
            <TextField fullWidth label="الوصف" placeholder="وصف القسم" multiline rows={3} {...field} disabled={dataIsLoading || formIsSubmitting} />
          )} />

          <Controller name="status" control={control} render={({ field }) => (
            <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} disabled={dataIsLoading || formIsSubmitting} />} label="نشط" />
          )} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/settings/wards')} disabled={formIsSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" variant="contained" disabled={formIsSubmitting || dataIsLoading}>
              {formIsSubmitting ? <CircularProgress size={20} /> : (isEditMode ? 'تحديث' : 'إضافة')}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WardFormPage;

