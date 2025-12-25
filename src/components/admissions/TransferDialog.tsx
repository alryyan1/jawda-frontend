import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import type { Admission, TransferFormData } from "@/types/admissions";
import { transferAdmission } from "@/services/admissionService";
import { getWardsList } from "@/services/wardService";
import { getRooms } from "@/services/roomService";
import { getAvailableBeds } from "@/services/bedService";

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  admission: Admission;
}

export default function TransferDialog({ open, onClose, admission }: TransferDialogProps) {
  const queryClient = useQueryClient();
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const { data: wards } = useQuery({
    queryKey: ['wardsList'],
    queryFn: () => getWardsList({ status: true }),
  });

  const { data: rooms, refetch: refetchRooms } = useQuery({
    queryKey: ['rooms', selectedWardId],
    queryFn: () => getRooms(1, { ward_id: selectedWardId!, per_page: 1000 }).then(res => res.data),
    enabled: !!selectedWardId,
  });

  const { data: beds, refetch: refetchBeds } = useQuery({
    queryKey: ['availableBeds', selectedRoomId],
    queryFn: () => getAvailableBeds({ room_id: selectedRoomId! }),
    enabled: !!selectedRoomId,
  });

  const form = useForm<TransferFormData>({
    defaultValues: {
      ward_id: '',
      room_id: '',
      bed_id: '',
      notes: '',
    },
  });
  const { control, handleSubmit, watch, setValue, reset } = form;

  const wardId = watch('ward_id');
  const roomId = watch('room_id');

  useEffect(() => {
    if (wardId) {
      setSelectedWardId(Number(wardId));
      setValue('room_id', '');
      setValue('bed_id', '');
      refetchRooms();
    }
  }, [wardId, setValue, refetchRooms]);

  useEffect(() => {
    if (roomId) {
      setSelectedRoomId(Number(roomId));
      setValue('bed_id', '');
      refetchBeds();
    }
  }, [roomId, setValue, refetchBeds]);

  const mutation = useMutation({
    mutationFn: (data: TransferFormData) => transferAdmission(admission.id, data),
    onSuccess: () => {
      toast.success('تم نقل المريض بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['admission', admission.id] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل نقل المريض');
    },
  });

  const onSubmit = (data: TransferFormData) => {
    if (!data.ward_id) return toast.error('يرجى اختيار القسم');
    if (!data.room_id) return toast.error('يرجى اختيار الغرفة');
    if (!data.bed_id) return toast.error('يرجى اختيار السرير');
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>نقل المريض</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="ward_id"
              control={control}
              rules={{ required: 'القسم مطلوب' }}
              render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error} disabled={mutation.isPending}>
                  <InputLabel>القسم الجديد</InputLabel>
                  <Select {...field} label="القسم الجديد">
                    {wards?.map((ward) => (
                      <MenuItem key={ward.id} value={String(ward.id)}>{ward.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="room_id"
              control={control}
              rules={{ required: 'الغرفة مطلوبة' }}
              render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error} disabled={!selectedWardId || mutation.isPending}>
                  <InputLabel>الغرفة الجديدة</InputLabel>
                  <Select {...field} label="الغرفة الجديدة">
                    {rooms?.map((room) => {
                      const roomTypeLabel = room.room_type === 'normal' ? 'عادي' : room.room_type === 'vip' ? 'VIP' : '';
                      const roomTypeDisplay = roomTypeLabel ? ` (${roomTypeLabel})` : '';
                      return (
                        <MenuItem key={room.id} value={String(room.id)}>
                          {room.room_number}{roomTypeDisplay}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="bed_id"
              control={control}
              rules={{ required: 'السرير مطلوب' }}
              render={({ field, fieldState }) => (
                <FormControl fullWidth error={!!fieldState.error} disabled={!selectedRoomId || mutation.isPending}>
                  <InputLabel>السرير الجديد</InputLabel>
                  <Select {...field} label="السرير الجديد">
                    {beds?.map((bed) => (
                      <MenuItem key={bed.id} value={String(bed.id)}>{bed.bed_number}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="ملاحظات"
                  multiline
                  rows={3}
                  {...field}
                  disabled={mutation.isPending}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
          <Button type="submit" variant="contained" color="info" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={20} /> : 'نقل'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

