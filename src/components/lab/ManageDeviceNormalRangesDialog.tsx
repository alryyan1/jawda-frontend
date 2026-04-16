import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { Save, Star, StarOff } from 'lucide-react';

import type { ChildTest, Device, DeviceNormalRange } from '@/types/labTests';
import { getDevicesList } from '@/services/deviceService';
import { getDeviceNormalRangesForChildTest, setDeviceNormalRange } from '@/services/deviceNormalRangeService';

interface ManageDeviceNormalRangesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  childTest: ChildTest | null;
}

const ManageDeviceNormalRangesDialog: React.FC<ManageDeviceNormalRangesDialogProps> = ({
  isOpen,
  onOpenChange,
  childTest,
}) => {
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  const [savingDeviceId, setSavingDeviceId] = useState<number | null>(null);

  const devicesQueryKey = ['devicesList'];
  const rangesQueryKey = ['deviceNormalRanges', childTest?.id];

  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<Device[]>({
    queryKey: devicesQueryKey,
    queryFn: getDevicesList,
    enabled: isOpen,
  });

  const { data: ranges = [], isLoading: isLoadingRanges } = useQuery<DeviceNormalRange[]>({
    queryKey: rangesQueryKey,
    queryFn: () => childTest ? getDeviceNormalRangesForChildTest(childTest.id!) : Promise.resolve([]),
    enabled: !!childTest && isOpen,
  });

  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: ({ deviceId, normalRange, isDefault }: { deviceId: number; normalRange: string; isDefault?: boolean }) =>
      setDeviceNormalRange(childTest!.id!, deviceId, { normal_range: normalRange, is_default: isDefault }),
    onSuccess: (_data, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: rangesQueryKey });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
      toast.success('تم حفظ المدى الطبيعي بنجاح');
    },
    onError: (error: Error) => toast.error(error.message || 'فشل حفظ المدى الطبيعي'),
    onSettled: () => { setSavingDeviceId(null); setSettingDefaultId(null); },
  });

  const getRangeForDevice = (deviceId: number): string => {
    const found = ranges.find((r) => r.device_id === deviceId);
    return found?.normal_range ?? '';
  };

  const isDefaultForDevice = (deviceId: number): boolean => {
    return ranges.find((r) => r.device_id === deviceId)?.is_default ?? false;
  };

  const getEditValue = (deviceId: number): string => {
    if (deviceId in editValues) return editValues[deviceId];
    return getRangeForDevice(deviceId);
  };

  const handleSave = (deviceId: number) => {
    const value = getEditValue(deviceId);
    setSavingDeviceId(deviceId);
    saveMutation.mutate({ deviceId, normalRange: value });
  };

  const handleSetDefault = (deviceId: number) => {
    const currentRange = getRangeForDevice(deviceId);
    if (!currentRange) {
      toast.warning('أدخل المدى الطبيعي أولاً قبل تعيينه كافتراضي');
      return;
    }
    setSettingDefaultId(deviceId);
    saveMutation.mutate({ deviceId, normalRange: currentRange, isDefault: true });
  };

  const isLoading = isLoadingDevices || isLoadingRanges;

  return (
    <Dialog open={isOpen} onClose={() => onOpenChange(false)} fullWidth maxWidth="md">
      <DialogTitle>
        المدى الطبيعي حسب الجهاز
        {childTest && (
          <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
            — {childTest.child_test_name}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : devices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            لا توجد أجهزة مسجلة. أضف أجهزة أولاً من زر "إدارة الأجهزة".
          </Typography>
        ) : (
          <Table size="small" sx={{ mt: 1 ,direction:'rtl'}}>
            <TableHead>
              <TableRow>
                <TableCell>الجهاز</TableCell>
                <TableCell>المدى الطبيعي</TableCell>
                <TableCell align="center" sx={{ width: 56 }}>حفظ</TableCell>
                <TableCell align="center" sx={{ width: 56 }}>افتراضي</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => {
                const currentRange = getRangeForDevice(device.id);
                const editVal = getEditValue(device.id);
                const isDirty = editVal !== currentRange;
                const isSaving = savingDeviceId === device.id && saveMutation.isPending;
                const isDefault = isDefaultForDevice(device.id);
                const isSettingDefault = settingDefaultId === device.id && saveMutation.isPending;

                return (
                  <TableRow
                    key={device.id}
                    hover
                    sx={isDefault ? { bgcolor: 'success.50', '& td': { borderColor: 'success.light' } } : {}}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {device.name}
                        {currentRange && !isDirty && (
                          <Chip label="محدد" size="small" color={isDefault ? 'warning' : 'success'} variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <TextField
                        multiline
                        rows={4}
                        size="small"
                        fullWidth
                        placeholder="مثال: 70-110 mg/dL"
                        value={editVal}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [device.id]: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="حفظ">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSave(device.id)}
                            disabled={!isDirty || isSaving}
                          >
                            {isSaving ? <CircularProgress size={16} /> : <Save className="h-4 w-4" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={isDefault ? 'الجهاز الافتراضي' : 'تعيين كافتراضي'}>
                        <span>
                          <IconButton
                            size="small"
                            color={isDefault ? 'warning' : 'default'}
                            onClick={() => handleSetDefault(device.id)}
                            disabled={isDefault || isSettingDefault || !currentRange}
                          >
                            {isSettingDefault
                              ? <CircularProgress size={16} />
                              : isDefault
                                ? <Star className="h-4 w-4" />
                                : <StarOff className="h-4 w-4" />
                            }
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
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

export default ManageDeviceNormalRangesDialog;
