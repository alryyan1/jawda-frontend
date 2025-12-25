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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Loader2 } from 'lucide-react';
import type { RoomFormData, Room } from '@/types/admissions';
import { createRoom, updateRoom, getRoomById } from '@/services/roomService';
import { getWardsList } from '@/services/wardService';

export const RoomFormMode = {
  CREATE: 'create',
  EDIT: 'edit'
} as const;

type RoomFormValues = {
  ward_id: string;
  room_number: string;
  room_type: string;
  capacity: string;
  status: boolean;
};

const RoomFormPage: React.FC<{ mode: typeof RoomFormMode[keyof typeof RoomFormMode] }> = ({ mode }) => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const queryClient = useQueryClient();
  const isEditMode = mode === RoomFormMode.EDIT;

  const { data: wards } = useQuery({
    queryKey: ['wardsList'],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data: roomData, isLoading: isLoadingRoom } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getRoomById(Number(roomId)).then(res => res.data as Room),
    enabled: isEditMode && !!roomId,
  });

  const form = useForm<RoomFormValues>({
    defaultValues: {
      ward_id: '',
      room_number: '',
      room_type: '',
      capacity: '1',
      status: true,
    },
  });
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (isEditMode && roomData) {
      reset({
        ward_id: String(roomData.ward_id ?? ''),
        room_number: roomData.room_number ?? '',
        room_type: roomData.room_type ?? '',
        capacity: String(roomData.capacity ?? '1'),
        status: Boolean(roomData.status),
      });
    }
  }, [isEditMode, roomData, reset]);

  const mutation = useMutation({
    mutationFn: (data: RoomFormData) =>
      isEditMode && roomId ? updateRoom(Number(roomId), data) : createRoom(data),
    onSuccess: () => {
      toast.success('تم حفظ بيانات الغرفة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      if (isEditMode && roomId) queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      navigate('/settings/rooms');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل حفظ بيانات الغرفة');
    },
  });

  const onSubmit = (data: RoomFormValues) => {
    if (!data.ward_id) return toast.error('يرجى اختيار القسم');
    if (!data.room_number.trim()) return toast.error('رقم الغرفة مطلوب');

    const submissionData: RoomFormData = {
      ward_id: data.ward_id,
      room_number: data.room_number,
      room_type: data.room_type || null,
      capacity: data.capacity,
      status: Boolean(data.status),
    };

    mutation.mutate(submissionData);
  };

  if (isEditMode && isLoadingRoom) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <Typography variant="h5">{isEditMode ? 'تعديل غرفة' : 'إضافة غرفة'}</Typography>
      </CardHeader>
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Controller name="ward_id" control={control} rules={{ required: 'القسم مطلوب' }} render={({ field, fieldState }) => (
            <FormControl fullWidth error={!!fieldState.error}>
              <InputLabel>القسم</InputLabel>
              <Select {...field} label="القسم" disabled={mutation.isPending}>
                {wards?.map((ward) => (
                  <MenuItem key={ward.id} value={String(ward.id)}>{ward.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )} />

          <Controller name="room_number" control={control} rules={{ required: 'رقم الغرفة مطلوب' }} render={({ field, fieldState }) => (
            <TextField fullWidth label="رقم الغرفة" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={mutation.isPending} />
          )} />

          <Controller name="room_type" control={control} render={({ field, fieldState }) => (
            <FormControl fullWidth error={!!fieldState.error}>
              <InputLabel>نوع الغرفة</InputLabel>
              <Select {...field} label="نوع الغرفة" disabled={mutation.isPending}>
                <MenuItem value="">بدون نوع</MenuItem>
                <MenuItem value="normal">عادي</MenuItem>
                <MenuItem value="vip">VIP</MenuItem>
              </Select>
            </FormControl>
          )} />

          <Controller name="capacity" control={control} rules={{ required: 'السعة مطلوبة' }} render={({ field, fieldState }) => (
            <TextField fullWidth label="السعة" type="number" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={mutation.isPending} />
          )} />

          <Controller name="status" control={control} render={({ field }) => (
            <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} disabled={mutation.isPending} />} label="نشط" />
          )} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/settings/rooms')} disabled={mutation.isPending}>إلغاء</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? <CircularProgress size={20} /> : (isEditMode ? 'تحديث' : 'إضافة')}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RoomFormPage;

