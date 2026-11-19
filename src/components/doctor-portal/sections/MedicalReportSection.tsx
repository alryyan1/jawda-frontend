import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import IconButton from '@mui/material/IconButton';
import { CheckCircle, ChevronDown, FolderClock, LogIn, PlayCircle, Printer, Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import RichTextEditor from '@/components/common/RichTextEditor';
import {
  getVisitMedicalReport,
  startVisitMedicalReport,
  updateVisitMedicalReport,
  getVisitMedicalReportPdfUrl,
  getSameFileMedicalReports,
} from '@/services/visitMedicalReportService';
import { useAuth } from '@/contexts/AuthContext';
import type { DoctorVisit } from '@/types/visits';
import type { VisitMedicalReport } from '@/types/medicalReport';
import dayjs from 'dayjs';

interface MedicalReportSectionProps {
  visit: DoctorVisit | undefined;
  /** Switches the workspace to another visit from the same file, if the caller supports it. */
  onSelectVisit?: (visitId: number) => void;
}

// One row in the "past reports" panel — its own print-loading state, since
// several rows can exist independently of the live editor above.
const PastReportAccordionItem: React.FC<{
  report: VisitMedicalReport;
  onSelectVisit?: (visitId: number) => void;
}> = ({ report, onSelectVisit }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleGoToVisit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectVisit?.(report.doctor_visit_id);
  };

  return (
    <Accordion disableGutters>
      <AccordionSummary expandIcon={<ChevronDown size={18} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={600}>
            {report.doctor_visit?.visit_date ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {report.doctor_visit?.doctor?.name ?? 'غير محدد'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            أضافه: {report.user?.name ?? 'غير معروف'}
          </Typography>
          {report.complete ? (
            <Chip icon={<CheckCircle size={12} />} label="مكتمل" color="success" size="small" />
          ) : (
            <Chip label="قيد الإعداد" color="primary" size="small" />
          )}
          <Box sx={{ flex: 1 }} />
          {onSelectVisit && (
            <IconButton size="small" title="الانتقال لهذه الزيارة" onClick={handleGoToVisit}>
              <LogIn size={16} />
            </IconButton>
          )}
          <IconButton size="small" title="طباعة PDF" disabled={isPrinting} onClick={handlePrint}>
            {isPrinting ? <CircularProgress size={14} /> : <Printer size={16} />}
          </IconButton>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <RichTextEditor value={report.content ?? ''} onChange={() => {}} disabled minHeight={160} />
      </AccordionDetails>
    </Accordion>
  );
};

const MedicalReportSection: React.FC<MedicalReportSectionProps> = ({ visit, onSelectVisit }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const visitId = visit?.id;
  const queryKey = ['visitMedicalReport', visitId];

  const { data: report, isLoading } = useQuery({
    queryKey,
    queryFn: () => getVisitMedicalReport(visitId!),
    enabled: !!visitId,
  });

  const { data: sameFileReports = [] } = useQuery({
    queryKey: ['sameFileMedicalReports', visitId],
    queryFn: () => getSameFileMedicalReports(visitId!),
    enabled: !!visitId,
  });

  const pastReports = sameFileReports.filter(r => r.doctor_visit_id !== visitId);

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

  const uncompleteMutation = useMutation({
    mutationFn: () => updateVisitMedicalReport(report!.id, { complete: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم إلغاء إكمال التقرير الطبي');
    },
    onError: () => toast.error('فشل إلغاء إكمال التقرير الطبي'),
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

      {pastReports.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FolderClock size={16} />
            <Typography variant="subtitle2" fontWeight={700}>
              تقارير طبية سابقة لنفس الملف
            </Typography>
          </Box>
          {pastReports.map(pastReport => (
            <PastReportAccordionItem key={pastReport.id} report={pastReport} onSelectVisit={onSelectVisit} />
          ))}
        </Box>
      )}

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
      {report?.user?.name && (
        <Typography variant="body2" color="text.secondary">
          ✒️تم إنشاء التقرير الطبي بواسطة {report.user.name} {report.created_at ? `في ${dayjs(report.created_at).format('DD/MM/YYYY HH:mm A')}` : ''}
        </Typography>
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
            {report.complete && isOwner && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={uncompleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Undo2 size={16} />}
                disabled={uncompleteMutation.isPending}
                onClick={() => uncompleteMutation.mutate()}
              >
                إلغاء الإكمال
              </Button>
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
