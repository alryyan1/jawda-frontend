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
  Button,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Loader2 } from 'lucide-react';
import type { BedFormData, Bed } from '@/types/admissions';
import { createBed, updateBed, getBedById } from '@/services/bedService';
import { getRooms } from '@/services/roomService';

export const BedFormMode = {
  CREATE: 'create',
  EDIT: 'edit'
} as const;

type BedFormValues = {
  room_id: string;
  bed_number: string;
  status: 'available' | 'occupied' | 'maintenance';
};

const BedFormPage: React.FC<{ mode: typeof BedFormMode[keyof typeof BedFormMode] }> = ({ mode }) => {
  const navigate = useNavigate();
  const { bedId } = useParams<{ bedId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === BedFormMode.EDIT;

  const { data: rooms } = useQuery({
    queryKey: ['roomsList'],
    queryFn: () => getRooms(1, { per_page: 1000 }).then(res => res.data),
  });

  const { data: bedData, isLoading: isLoadingBed } = useQuery({
    queryKey: ['bed', bedId],
    queryFn: () => getBedById(Number(bedId)).then(res => res.data as Bed),
    enabled: isEditMode && !!bedId,
  });

  const form = useForm<BedFormValues>({
    defaultValues: {
      room_id: '',
      bed_number: '',
      status: 'available',
    },
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (isEditMode && bedData) {
      reset({
        room_id: String(bedData.room_id ?? ''),
        bed_number: bedData.bed_number ?? '',
        status: bedData.status ?? 'available',
      });
    }
  }, [isEditMode, bedData, reset]);

  const mutation = useMutation({
    mutationFn: (data: BedFormData) =>
      isEditMode && bedId ? updateBed(Number(bedId), data) : createBed(data),
    onSuccess: () => {
      toast.success('تم حفظ بيانات السرير بنجاح');
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      if (isEditMode && bedId) queryClient.invalidateQueries({ queryKey: ['bed', bedId] });
      navigate('/settings/beds');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حفظ بيانات السرير');
    },
  });

  const onSubmit = (data: BedFormValues) => {
    if (!data.room_id) return toast.error('يرجى اختيار الغرفة');
    if (!data.bed_number.trim()) return toast.error('رقم السرير مطلوب');

    const submissionData: BedFormData = {
      room_id: data.room_id,
      bed_number: data.bed_number,
      status: data.status,
    };

    mutation.mutate(submissionData);
  };

  if (isEditMode && isLoadingBed) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <Typography variant="h5">{isEditMode ? 'تعديل سرير' : 'إضافة سرير'}</Typography>
      </CardHeader>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller name="room_id" control={control} rules={{ required: 'الغرفة مطلوبة' }} render={({ field, fieldState }) => (
            <FormControl fullWidth error={!!fieldState.error}>
              <InputLabel>الغرفة</InputLabel>
              <Select {...field} label="الغرفة" disabled={mutation.isPending}>
                {rooms?.map((room) => {
                  const roomTypeLabel = room.room_type === 'normal' ? 'عادي' : room.room_type === 'vip' ? 'VIP' : '';
                  const roomTypeDisplay = roomTypeLabel ? ` (${roomTypeLabel})` : '';
                  return (
                    <MenuItem key={room.id} value={String(room.id)}>
                      {room.room_number}{roomTypeDisplay} - {room.ward?.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )} />

          <Controller name="bed_number" control={control} rules={{ required: 'رقم السرير مطلوب' }} render={({ field, fieldState }) => (
            <TextField fullWidth label="رقم السرير" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={mutation.isPending} />
          )} />

          <Controller name="status" control={control} render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>الحالة</InputLabel>
              <Select {...field} label="الحالة" disabled={mutation.isPending}>
                <MenuItem value="available">متاح</MenuItem>
                <MenuItem value="occupied">مشغول</MenuItem>
                <MenuItem value="maintenance">صيانة</MenuItem>
              </Select>
            </FormControl>
          )} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/settings/beds')} disabled={mutation.isPending}>إلغاء</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? <CircularProgress size={20} /> : (isEditMode ? 'تحديث' : 'إضافة')}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BedFormPage;

