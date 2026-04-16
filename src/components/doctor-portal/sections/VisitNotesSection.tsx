import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { FileText } from 'lucide-react';
import type { DoctorVisit } from '@/types/visits';

interface VisitNotesSectionProps {
  visit: DoctorVisit | undefined;
}

interface NoteBlockProps {
  label: string;
  value?: string | null;
}

const NoteBlock: React.FC<NoteBlockProps> = ({ label, value }) => {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.82rem' }}>
        {value}
      </Typography>
    </Box>
  );
};

const VisitNotesSection: React.FC<VisitNotesSectionProps> = ({ visit }) => {
  if (!visit) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
        <Typography>لم يتم تحديد مريض</Typography>
      </Box>
    );
  }

  // Collect unique doctor/nurse notes from services
  const doctorNotesFromServices: { service: string; note: string }[] = [];
  const nurseNotesFromServices: { service: string; note: string }[] = [];

  (visit.requested_services ?? []).forEach(svc => {
    if (svc.doctor_note) {
      doctorNotesFromServices.push({ service: svc.service?.name ?? '—', note: svc.doctor_note });
    }
    if (svc.nurse_note) {
      nurseNotesFromServices.push({ service: svc.service?.name ?? '—', note: svc.nurse_note });
    }
  });

  const hasAnyContent =
    visit.reason_for_visit ||
    visit.visit_notes ||
    doctorNotesFromServices.length > 0 ||
    nurseNotesFromServices.length > 0;

  if (!hasAnyContent) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
        <FileText size={36} />
        <Typography>لا توجد ملاحظات للزيارة</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {(visit.reason_for_visit || visit.visit_notes) && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            ملاحظات الزيارة
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <NoteBlock label="سبب الزيارة" value={visit.reason_for_visit} />
            {visit.reason_for_visit && visit.visit_notes && <Divider />}
            <NoteBlock label="ملاحظات عامة" value={visit.visit_notes} />
          </Box>
        </Paper>
      )}

      {doctorNotesFromServices.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'info.light', borderRadius: 2, bgcolor: 'rgba(14,165,233,0.03)' }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom color="info.dark">
            ملاحظات الطبيب على الخدمات
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {doctorNotesFromServices.map((n, i) => (
              <Box key={i}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.25 }}>
                  {n.service}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{n.note}</Typography>
                {i < doctorNotesFromServices.length - 1 && <Divider sx={{ mt: 1.5 }} />}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {nurseNotesFromServices.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'success.light', borderRadius: 2, bgcolor: 'rgba(34,197,94,0.03)' }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom color="success.dark">
            ملاحظات التمريض
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {nurseNotesFromServices.map((n, i) => (
              <Box key={i}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.25 }}>
                  {n.service}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{n.note}</Typography>
                {i < nurseNotesFromServices.length - 1 && <Divider sx={{ mt: 1.5 }} />}
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default VisitNotesSection;
