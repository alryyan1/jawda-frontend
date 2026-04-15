import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

import type { Device } from '@/types/labTests';
import { getDevicesList, createDevice, updateDevice, deleteDevice } from '@/services/deviceService';

interface ManageDevicesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const deviceSchema = z.object({
  name: z.string().min(1, 'اسم الجهاز مطلوب').max(255),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

const DEVICES_QUERY_KEY = ['devicesList'];

const ManageDevicesDialog: React.FC<ManageDevicesDialogProps> = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: DEVICES_QUERY_KEY,
    queryFn: getDevicesList,
    enabled: isOpen,
  });

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: { name: '' },
  });

  const createMutation = useMutation({
    mutationFn: (data: DeviceFormValues) => createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });
      form.reset();
      toast.success('تمت إضافة الجهاز بنجاح');
    },
    onError: (error: Error) => toast.error(error.message || 'فشل إضافة الجهاز'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeviceFormValues }) => updateDevice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });
      form.reset();
      setEditingDevice(null);
      toast.success('تم تحديث الجهاز بنجاح');
    },
    onError: (error: Error) => toast.error(error.message || 'فشل تحديث الجهاز'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICES_QUERY_KEY });
      toast.success('تم حذف الجهاز بنجاح');
    },
    onError: (error: Error) => toast.error(error.message || 'فشل حذف الجهاز'),
  });

  const handleSubmit = (data: DeviceFormValues) => {
    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    form.setValue('name', device.name);
  };

  const handleCancelEdit = () => {
    setEditingDevice(null);
    form.reset();
  };

  const handleDelete = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
      deleteMutation.mutate(id);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="sm">
      <DialogTitle>إدارة الأجهزة</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={form.handleSubmit(handleSubmit)} sx={{ mt: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="اسم الجهاز (مثال: Roche, Snibe, Mindray)"
              {...form.register('name')}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <Button type="submit" variant="contained" disabled={isPending} sx={{ whiteSpace: 'nowrap' }}>
              {isPending ? (
                <CircularProgress size={18} sx={{ color: 'white' }} />
              ) : editingDevice ? (
                <Edit className="h-4 w-4" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
            </Button>
            {editingDevice && (
              <Button variant="outlined" onClick={handleCancelEdit} size="small">
                إلغاء
              </Button>
            )}
          </Box>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : devices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            لا توجد أجهزة مسجلة
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>اسم الجهاز</TableCell>
                <TableCell align="right">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} hover selected={editingDevice?.id === device.id}>
                  <TableCell>{device.name}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEdit(device)}>
                        <Edit className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(device.id)}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)} variant="outlined">إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageDevicesDialog;
