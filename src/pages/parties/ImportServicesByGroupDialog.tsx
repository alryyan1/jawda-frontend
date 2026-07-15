// src/pages/parties/ImportServicesByGroupDialog.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { FolderInput } from 'lucide-react';

import type { ServiceGroup } from '@/types/services';
import { getAllServiceGroupsList } from '@/services/serviceGroupService';
import { importPartyServicesByGroup } from '@/services/partyService';

type PriceImportPreference = 'standard_price' | 'zero_price';

interface ImportServicesByGroupDialogProps {
  partyId: number;
  partyName: string;
  onImported: () => void;
}

const ImportServicesByGroupDialog: React.FC<ImportServicesByGroupDialogProps> = ({ partyId, partyName, onImported }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');

  const { data: serviceGroups = [], isLoading: isLoadingGroups } = useQuery<ServiceGroup[], Error>({
    queryKey: ['serviceGroupsList'],
    queryFn: () => getAllServiceGroupsList(),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (preference: PriceImportPreference) =>
      importPartyServicesByGroup(partyId, {
        service_group_id: Number(selectedGroupId),
        price_preference: preference,
      }),
    onSuccess: (data) => {
      toast.success(data.message || 'تم استيراد الخدمات بنجاح');
      queryClient.invalidateQueries({ queryKey: ['partyServiceCosts', partyId] });
      queryClient.invalidateQueries({ queryKey: ['partyAvailableServices', partyId] });
      onImported();
      handleClose();
    },
    onError: (error: unknown) => {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل في استيراد الخدمات';
      toast.error(errorMessage);
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setSelectedGroupId('');
  };

  const handleConfirm = (preference: PriceImportPreference) => {
    if (!selectedGroupId) {
      toast.error('يرجى اختيار مجموعة خدمات');
      return;
    }
    mutation.mutate(preference);
  };

  return (
    <>
      <Button variant="outlined" size="small" startIcon={<FolderInput className="h-4 w-4" />} onClick={() => setIsOpen(true)}>
        استيراد من مجموعة خدمات
      </Button>
      <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ py: 1.5 }}>استيراد خدمات من مجموعة</DialogTitle>
        <DialogContent sx={{ pb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            اختر مجموعة خدمات لاستيراد جميع خدماتها النشطة إلى أسعار {partyName}. الخدمات المسعّرة مسبقاً لن تتأثر.
          </Typography>
          <FormControl fullWidth size="small" disabled={mutation.isPending}>
            <InputLabel>مجموعة الخدمات</InputLabel>
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value as number | '')}
              label="مجموعة الخدمات"
            >
              {isLoadingGroups ? (
                <MenuItem value="" disabled>جار التحميل...</MenuItem>
              ) : (
                serviceGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={handleClose} variant="outlined" size="small" disabled={mutation.isPending} sx={{ minWidth: { xs: '100%', sm: 'auto' } }}>
              إلغاء
            </Button>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Button
                onClick={() => handleConfirm('zero_price')}
                variant="outlined"
                size="small"
                disabled={mutation.isPending || !selectedGroupId}
                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
              >
                تعيين السعر بصفر
              </Button>
              <Button
                onClick={() => handleConfirm('standard_price')}
                variant="contained"
                size="small"
                disabled={mutation.isPending || !selectedGroupId}
                startIcon={mutation.isPending ? <CircularProgress size={16} /> : undefined}
                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
              >
                استخدام السعر القياسي
              </Button>
            </Stack>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportServicesByGroupDialog;
