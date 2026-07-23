import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import { FileText, Image as ImageIcon, File as FileIcon, Trash2, Plus, Download } from 'lucide-react';

import { getPatientAttachments, deleteAttachment } from '@/services/medicalAttachmentService';
import AddAttachmentDialog from '../AddAttachmentDialog';
import type { DoctorVisit } from '@/types/visits';

interface AttachmentsSectionProps {
  visit: DoctorVisit | undefined;
}

const CATEGORY_LABELS: Record<string, string> = {
  lab_result: 'نتيجة مختبر',
  radiology: 'أشعة',
  referral: 'تحويل',
  insurance: 'تأمين',
  prescription: 'وصفة طبية',
  other: 'أخرى',
};

const fileIconFor = (mime: string) => {
  if (mime.startsWith('image/')) return <ImageIcon size={18} />;
  if (mime === 'application/pdf') return <FileText size={18} />;
  return <FileIcon size={18} />;
};

const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ visit }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const patientId = visit?.patient_id;

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['patientAttachments', patientId],
    queryFn: () => getPatientAttachments(patientId!),
    enabled: !!patientId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAttachment(id),
    onSuccess: () => {
      toast.success('تم حذف المرفق');
      queryClient.invalidateQueries({ queryKey: ['patientAttachments', patientId] });
    },
    onError: () => toast.error('فشل حذف المرفق'),
  });

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          المرفقات
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => setAddOpen(true)}
        >
          إضافة مرفق
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : attachments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
          <Typography>لا توجد مرفقات</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {attachments.map((a) => (
            <Paper
              key={a.id}
              variant="outlined"
              sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}
            >
              <Box sx={{ color: 'primary.main', display: 'flex' }}>{fileIconFor(a.mime_type)}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {a.title || a.original_filename}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(a.created_at).toLocaleString('ar-EG')}
                  {a.uploaded_by_user ? ` — ${a.uploaded_by_user.name}` : ''}
                </Typography>
              </Box>
              <Chip label={CATEGORY_LABELS[a.category] ?? a.category} size="small" />
              <Tooltip title="تحميل">
                <IconButton size="small" component="a" href={a.url} target="_blank" rel="noopener noreferrer">
                  <Download size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton
                  size="small"
                  color="error"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(a.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Box>
      )}

      <AddAttachmentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        visitId={visit.id}
        patientId={patientId!}
      />
    </Box>
  );
};

export default AttachmentsSection;
