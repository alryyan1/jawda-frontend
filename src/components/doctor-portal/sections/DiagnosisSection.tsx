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
  getVisitDiagnosis,
  startVisitDiagnosis,
  updateVisitDiagnosis,
  openVisitDiagnosisPdf,
} from '@/services/visitDiagnosisService';
import { useAuth } from '@/contexts/AuthContext';
import type { DoctorVisit } from '@/types/visits';

interface DiagnosisSectionProps {
  visit: DoctorVisit | undefined;
}

const DiagnosisSection: React.FC<DiagnosisSectionProps> = ({ visit }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const visitId = visit?.id;
  const queryKey = ['visitDiagnosis', visitId];

  const { data: diagnosis, isLoading } = useQuery({
    queryKey,
    queryFn: () => getVisitDiagnosis(visitId!),
    enabled: !!visitId,
  });

  const [text, setText] = useState('');

  useEffect(() => {
    if (diagnosis?.diagnosis) {
      setText(diagnosis.diagnosis);
    }
  }, [diagnosis?.id]);

  const startMutation = useMutation({
    mutationFn: () => startVisitDiagnosis(visitId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم بدء التشخيص');
    },
    onError: () => toast.error('فشل بدء التشخيص'),
  });

  const saveMutation = useMutation({
    mutationFn: (html: string) => updateVisitDiagnosis(diagnosis!.id, { diagnosis: html }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم حفظ التشخيص');
    },
    onError: () => toast.error('فشل حفظ التشخيص'),
  });

  const completeMutation = useMutation({
    mutationFn: () => updateVisitDiagnosis(diagnosis!.id, { diagnosis: text, complete: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('تم إكمال التشخيص');
    },
    onError: () => toast.error('فشل إكمال التشخيص'),
  });

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

  const isOwner = !!diagnosis && diagnosis.user_id === user?.id;
  const canEdit = !diagnosis || (isOwner && !diagnosis.complete);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          التشخيص / الملاحظة الطبية
        </Typography>
        {diagnosis?.complete ? (
          <Chip icon={<CheckCircle size={14} />} label="مكتملة" color="success" size="small" />
        ) : diagnosis ? (
          <Chip label="قيد التنفيذ" color="primary" size="small" />
        ) : (
          <Chip label="لم يبدأ بعد" color="default" size="small" />
        )}
      </Box>

      {!diagnosis && (
        <Button
          variant="contained"
          startIcon={startMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <PlayCircle size={18} />}
          disabled={startMutation.isPending}
          onClick={() => startMutation.mutate()}
          sx={{ alignSelf: 'flex-start' }}
        >
          بدء التشخيص
        </Button>
      )}

      {diagnosis && (
        <>
          <RichTextEditor
            value={text}
            onChange={setText}
            disabled={!canEdit}
            minHeight={320}
            placeholder="اكتب التشخيص أو الملاحظة الطبية هنا..."
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
                startIcon={<Printer size={16} />}
                onClick={() => openVisitDiagnosisPdf(diagnosis.id)}
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

export default DiagnosisSection;
