import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { MessageCircle } from 'lucide-react';
import { getCompanionContact, sendVisitDoseWhatsApp } from '@/services/visitDoseService';
import type { SendWhatsAppResult } from '@/types/doses';

interface SendDoseWhatsAppDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
  doseId: number | null;
}

const SendDoseWhatsAppDialog: React.FC<SendDoseWhatsAppDialogProps> = ({ open, onClose, visitId, doseId }) => {
  const [phone, setPhone] = useState('');

  const { data: contact, isFetching } = useQuery({
    queryKey: ['companionContact', visitId],
    queryFn: () => getCompanionContact(visitId),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setPhone(contact?.phone ?? '');
    }
  }, [open, contact]);

  const mutation = useMutation({
    mutationFn: () => sendVisitDoseWhatsApp(visitId, doseId!, phone.trim() || undefined),
    onSuccess: () => {
      toast.success('تم إرسال الإشعار إلى مرافق المريض عبر واتساب');
      onClose();
    },
    onError: (error: AxiosError<SendWhatsAppResult>) => {
      toast.error(error.response?.data?.error ?? 'فشل إرسال الإشعار عبر واتساب');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MessageCircle size={20} />
        إرسال إشعار عبر واتساب
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="رقم هاتف المرافق"
          size="small"
          fullWidth
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={isFetching ? 'جاري البحث عن رقم المرافق...' : 'أدخل رقم الهاتف'}
          InputProps={{
            endAdornment: isFetching ? <CircularProgress size={16} /> : null,
          }}
        />
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">إلغاء</Button>
        <Button
          variant="contained"
          disabled={!phone.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          إرسال
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendDoseWhatsAppDialog;
