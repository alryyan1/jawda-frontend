import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import { Paperclip, UploadCloud } from 'lucide-react';
import { uploadAttachment } from '@/services/medicalAttachmentService';

interface AddAttachmentDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: number;
  patientId: number;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'lab_result', label: 'نتيجة مختبر' },
  { value: 'radiology', label: 'أشعة' },
  { value: 'referral', label: 'تحويل' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'prescription', label: 'وصفة طبية' },
  { value: 'other', label: 'أخرى' },
];

const AddAttachmentDialog: React.FC<AddAttachmentDialogProps> = ({ open, onClose, visitId, patientId }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('other');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => uploadAttachment({ visitId, file: file!, category, title: title || undefined, note: note || undefined }),
    onSuccess: () => {
      toast.success('تم رفع المرفق بنجاح');
      queryClient.invalidateQueries({ queryKey: ['patientAttachments', patientId] });
      handleClose();
    },
    onError: () => toast.error('حدث خطأ أثناء رفع المرفق'),
  });

  const handleClose = () => {
    setFile(null);
    setCategory('other');
    setTitle('');
    setNote('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Paperclip size={20} />
        إضافة مرفق
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadCloud size={18} />}
          sx={{ alignSelf: 'flex-start' }}
        >
          اختر ملف
          <input
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        {file && (
          <Typography variant="body2" color="text.secondary">
            {file.name} ({(file.size / 1024).toFixed(0)} KB)
          </Typography>
        )}

        <TextField
          select
          label="التصنيف"
          size="small"
          fullWidth
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="عنوان (اختياري)"
          size="small"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <TextField
          label="ملاحظة (اختياري)"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={handleClose} color="inherit">إلغاء</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          disabled={!file || mutation.isPending}
          onClick={() => mutation.mutate()}
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          رفع
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAttachmentDialog;
