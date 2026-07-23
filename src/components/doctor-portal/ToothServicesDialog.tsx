import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import { updateRequestedServiceDetails } from '@/services/visitService';
import type { RequestedService } from '@/types/visits';

interface ToothServicesDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
  toothId: number | null;
  services: RequestedService[];
}

const ToothServicesDialog: React.FC<ToothServicesDialogProps> = ({
  open, onClose, visitId, toothId, services,
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, tooth_id }: { id: number; tooth_id: number | null }) =>
      updateRequestedServiceDetails(id, { tooth_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctorVisit', visitId] });
    },
    onError: () => toast.error('فشل تحديث الخدمة المرتبطة بالسن'),
  });

  const handleToggle = (svc: RequestedService, checked: boolean) => {
    mutation.mutate({ id: svc.id, tooth_id: checked ? toothId : null });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem' }}>
        خدمات السن رقم {toothId}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {services.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="body2">
              لا توجد خدمات مطلوبة لهذه الزيارة بعد. أضف خدمات من قسم "الخدمات" أولاً ثم عد لإسنادها لسن معين.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {services.map(svc => {
              const checked = svc.tooth_id === toothId;
              const assignedElsewhere = svc.tooth_id != null && svc.tooth_id !== toothId;
              return (
                <ListItem
                  key={svc.id}
                  disableGutters
                  secondaryAction={assignedElsewhere ? (
                    <Chip label={`سن ${svc.tooth_id}`} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                  ) : null}
                >
                  <ListItemIcon sx={{ minWidth: 34 }}>
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={checked}
                      disabled={mutation.isPending}
                      onChange={(_, value) => handleToggle(svc, value)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={svc.service?.name ?? '—'}
                    slotProps={{ primary: { sx: { fontSize: '0.85rem' } } }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ToothServicesDialog;
