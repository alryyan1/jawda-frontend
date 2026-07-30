import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { CheckCircle, PlayCircle, Printer, Save } from 'lucide-react';
import { toast } from 'sonner';

import RichTextEditor from '@/components/common/RichTextEditor';
import {
  getVisitMedicalReport,
  startVisitMedicalReport,
  updateVisitMedicalReport,
  getVisitMedicalReportPdfUrl,
} from '@/services/visitMedicalReportService';
import { useAuth } from '@/contexts/AuthContext';
import type { DoctorVisit } from '@/types/visits';

interface MedicalReportSectionProps {
  visit: DoctorVisit | undefined;
}

const MedicalReportSection: React.FC<MedicalReportSectionProps> = ({ visit }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const visitId = visit?.id;
  const queryKey = ['visitMedicalReport', visitId];

  const { data: report, isLoading } = useQuery({
    queryKey,
    queryFn: () => getVisitMedicalReport(visitId!),
    enabled: !!visitId,
  });

  const [text, setText] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (report?.content) {
      setText(report.content);
    }
  }, [report?.id]);

  const startMutation = useMutation({
    mutationFn: () => startVisitMedicalReport(visitId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم بدء التقرير الطبي');
    },
    onError: () => toast.error('فشل بدء التقرير الطبي'),
  });

  const saveMutation = useMutation({
    mutationFn: (html: string) => updateVisitMedicalReport(report!.id, { content: html }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم حفظ التقرير الطبي');
    },
    onError: () => toast.error('فشل حفظ التقرير الطبي'),
  });

  const completeMutation = useMutation({
    mutationFn: () => updateVisitMedicalReport(report!.id, { content: text, complete: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم إكمال التقرير الطبي');
    },
    onError: () => toast.error('فشل إكمال التقرير الطبي'),
  });

  const handlePrint = async () => {
    if (!report) return;
    setIsPrinting(true);
    try {
      const pdfUrl = await getVisitMedicalReportPdfUrl(report.id);
      window.open(pdfUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10_000);
    } catch {
      toast.error('فشل إنشاء ملف التقرير الطبي');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isOwner = !!report && report.user_id === user?.id;
  const canEdit = !report || (isOwner && !report.complete);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          التقرير الطبي
        </Typography>
        {report?.complete ? (
          <Chip icon={<CheckCircle size={14} />} label="مكتمل" color="success" size="small" />
        ) : report ? (
          <Chip label="قيد الإعداد" color="primary" size="small" />
        ) : (
          <Chip label="لم يبدأ بعد" color="default" size="small" />
        )}
      </Box>

      {!report && (
        <Button
          variant="contained"
          startIcon={startMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <PlayCircle size={18} />}
          disabled={startMutation.isPending}
          onClick={() => startMutation.mutate()}
          sx={{ alignSelf: 'flex-start' }}
        >
          بدء التقرير الطبي
        </Button>
      )}

      {report && (
        <>
          <RichTextEditor
            value={text}
            onChange={setText}
            disabled={!canEdit}
            minHeight={320}
            placeholder="اكتب التقرير الطبي هنا..."
          />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {canEdit && (
              <>
                <Button
                  variant="outlined"
                  startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                  disabled={saveMutation.isPending || completeMutation.isPending}
                  onClick={() => saveMutation.mutate(text)}
                >
                  حفظ
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={completeMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
                  disabled={!text.trim() || saveMutation.isPending || completeMutation.isPending}
                  onClick={() => completeMutation.mutate()}
                >
                  إكمال
                </Button>
              </>
            )}
            {text && (
              <Button
                variant="outlined"
                color="error"
                startIcon={isPrinting ? <CircularProgress size={16} color="inherit" /> : <Printer size={16} />}
                disabled={isPrinting}
                onClick={handlePrint}
              >
                طباعة PDF
              </Button>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default MedicalReportSection;
