import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { Male, Female } from '@mui/icons-material';
import { ClipboardList, FileText, FlaskConical, HeartPulse, Pill, Printer, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getDoctorVisitById } from '@/services/visitService';
import { getMedicalHistory } from '@/services/patientMedicalHistoryService';
import { getVisitSummaryPdfUrl } from '@/services/visitSummaryService';
import {
  getVisitVitalsPdfUrl,
  getVisitPrescriptionsPdfUrl,
  getPatientMedicalHistoryPdfUrl,
  getVisitLabReportPdfUrl,
  sendVisitDocumentsWhatsAppMenu,
} from '@/services/visitDocumentsService';
import { startVisitMedicalReport, getVisitMedicalReportPdfUrl } from '@/services/visitMedicalReportService';
import type { DoctorVisit } from '@/types/visits';
import type { ActivePatientVisit } from '@/types/patients';
import type { PatientMedicalHistory } from '@/types/medicalHistory';

import MedicalActionGrid, { type SectionKey } from './MedicalActionGrid';
import PatientInfoSection from './sections/PatientInfoSection';
import ServicesSection from './sections/ServicesSection';
import LabResultsSection from './sections/LabResultsSection';
import VisitNotesSection from './sections/VisitNotesSection';
import MedicalHistorySection from './sections/MedicalHistorySection';
import VitalsSection from './sections/VitalsSection';
import SystemsReviewSection from './sections/SystemsReviewSection';
import DiagnosisSection from './sections/DiagnosisSection';
import MedicalReportSection from './sections/MedicalReportSection';
import AppointmentSection from './sections/AppointmentSection';
import AttachmentsSection from './sections/AttachmentsSection';
import PrescriptionsSection from './sections/PrescriptionsSection';
import TeethSection from './sections/TeethSection';
import FileVisitsSection from './sections/FileVisitsSection';
import LabReportPdfPreviewDialog from '@/components/common/LabReportPdfPreviewDialog';

interface PatientWorkspaceProps {
  visitId: number;
  initialVisit: ActivePatientVisit | null;
  /** Whether the "current visit" vitals form is pinned as a side panel instead of shown inline in the vitals tab. */
  isVitalsPinned?: boolean;
  onToggleVitalsPinned?: () => void;
  /** Switches the workspace to another visit — used by the "same file" list to jump between a patient's registrations. */
  onSelectVisit?: (visitId: number) => void;
}



const PatientWorkspace: React.FC<PatientWorkspaceProps> = ({ visitId, initialVisit, isVitalsPinned, onToggleVitalsPinned, onSelectVisit }) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('info');
  const [printMenuAnchor, setPrintMenuAnchor] = useState<null | HTMLElement>(null);
  const [printDialog, setPrintDialog] = useState<{
    open: boolean;
    loading: boolean;
    url: string | null;
    title: string;
    fileName: string;
  }>({ open: false, loading: false, url: null, title: '', fileName: '' });

  const printDocument = async (title: string, fileName: string, fetchUrl: () => Promise<string>, errorMessage: string) => {
    setPrintDialog({ open: true, loading: true, url: null, title, fileName });
    try {
      const url = await fetchUrl();
      setPrintDialog(prev => ({ ...prev, url, loading: false }));
    } catch {
      toast.error(errorMessage);
      setPrintDialog(prev => ({ ...prev, open: false, loading: false }));
    }
  };

  // Visit data
  const { data: visit, isLoading: isLoadingVisit } = useQuery<DoctorVisit>({
    queryKey: ['doctorVisit', visitId],
    queryFn: () => getDoctorVisitById(visitId),
    enabled: !!visitId,
  });

  // Resolve patient id from either the fetched visit or the initial snapshot
  const patientId = visit?.patient_id ?? initialVisit?.patient_id;

  // Medical history (vitals, history, systems)
  const { data: medHistory, isLoading: isLoadingMedHistory } = useQuery<PatientMedicalHistory>({
    queryKey: ['medicalHistory', patientId],
    queryFn: () => getMedicalHistory(patientId!),
    enabled: !!patientId,
  });

  // Use initialVisit patient while visit data loads, for the identity bar
  const patient = visit?.patient ?? initialVisit?.patient;
  const visitStatus = visit?.status ?? initialVisit?.status;

  // Sends the "visit_documents_menu" WhatsApp template (medical report /
  // diagnosis / prescription quick-reply buttons) to this visit's patient.
  const sendDocumentsMenuMutation = useMutation({
    mutationFn: () => sendVisitDocumentsWhatsAppMenu(visitId),
    onSuccess: result => {
      if (result.success) {
        toast.success('تم إرسال قائمة المستندات عبر واتساب');
      } else {
        toast.error(result.error || 'فشل إرسال قائمة المستندات');
      }
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'فشل إرسال قائمة المستندات');
    },
  });

  // Combined loading check for visit
  if (isLoadingVisit && !initialVisit) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Identity bar */}
      <Paper
        elevation={0}
        square
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        {/* Gender icon + Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
       
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>
            {patient?.name ?? '—'}
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Age */}
        <Typography variant="body2" color="text.secondary">
          {patient?.full_age ?? (patient?.age_year ? `${patient.age_year} سنة` : '—')}
        </Typography>
        <Divider orientation="vertical" flexItem />

        {/* File number + visit id */}
        <Typography variant="body2" color="text.secondary">
          ملف #{visit?.file_id ?? initialVisit?.file_id ?? '—'} — زيارة #{visitId}
        </Typography>
          {/* visit date */}
        {visit?.created_at && (
          <Typography variant="body2" color="text.secondary">
            {new Date(visit.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Typography>
        )}
        {/* Company */}
        {patient?.company_id && (
          <Chip
            label={(patient.company as any)?.name ?? 'شركة تأمين'}
            size="small"
            sx={{
              fontSize: '0.72rem',
              height: 22,
              bgcolor: 'rgba(236,72,153,0.12)',
              color: 'rgb(219,39,119)',
              border: '1px solid rgba(236,72,153,0.3)',
            }}
          />
        )}

       
        {/* Loading indicator while visit is fetching in background */}
        {isLoadingVisit && (
          <CircularProgress size={14} />
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          size="small"
          variant="outlined"
          startIcon={<Printer size={16} />}
          onClick={(e) => setPrintMenuAnchor(e.currentTarget)}
        >
          طباعة
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="success"
          startIcon={
            sendDocumentsMenuMutation.isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Send size={16} />
            )
          }
          disabled={sendDocumentsMenuMutation.isPending}
          onClick={() => sendDocumentsMenuMutation.mutate()}
        >
          إرسال المستندات عبر واتساب
        </Button>
        <Menu
          anchorEl={printMenuAnchor}
          open={Boolean(printMenuAnchor)}
          onClose={() => setPrintMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setPrintMenuAnchor(null);
              printDocument(
                'الوصفات الطبية',
                `visit-prescriptions-${visitId}.pdf`,
                () => getVisitPrescriptionsPdfUrl(visitId),
                'فشل إنشاء ملف الوصفات الطبية'
              );
            }}
          >
            <ListItemIcon>
              <Pill size={16} />
            </ListItemIcon>
            <ListItemText>الوصفات</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setPrintMenuAnchor(null);
              printDocument(
                'نتائج المختبر',
                `visit-lab-report-${visitId}.pdf`,
                () => getVisitLabReportPdfUrl(visitId),
                'فشل إنشاء تقرير المختبر'
              );
            }}
          >
            <ListItemIcon>
              <FlaskConical size={16} />
            </ListItemIcon>
            <ListItemText>المختبر</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setPrintMenuAnchor(null);
              printDocument(
                'العلامات الحيوية',
                `visit-vitals-${visitId}.pdf`,
                () => getVisitVitalsPdfUrl(visitId),
                'فشل إنشاء ملف العلامات الحيوية'
              );
            }}
          >
            <ListItemIcon>
              <HeartPulse size={16} />
            </ListItemIcon>
            <ListItemText>العلامات الحيوية</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={!patientId}
            onClick={() => {
              setPrintMenuAnchor(null);
              printDocument(
                'التاريخ المرضي',
                `medical-history-${patientId}.pdf`,
                () => getPatientMedicalHistoryPdfUrl(patientId!),
                'فشل إنشاء ملف التاريخ المرضي'
              );
            }}
          >
            <ListItemIcon>
              <ClipboardList size={16} />
            </ListItemIcon>
            <ListItemText>التاريخ المرضي</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setPrintMenuAnchor(null);
              printDocument(
                'ملخص الزيارة',
                `visit-summary-${visitId}.pdf`,
                () => getVisitSummaryPdfUrl(visitId),
                'فشل إنشاء ملخص الزيارة'
              );
            }}
          >
            <ListItemIcon>
              <Printer size={16} />
            </ListItemIcon>
            <ListItemText>الملخص</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setPrintMenuAnchor(null);
              printDocument(
                'التقرير الطبي',
                `visit-medical-report-${visitId}.pdf`,
                async () => {
                  const report = await startVisitMedicalReport(visitId);
                  return getVisitMedicalReportPdfUrl(report.id);
                },
                'فشل إنشاء التقرير الطبي'
              );
            }}
          >
            <ListItemIcon>
              <FileText size={16} />
            </ListItemIcon>
            <ListItemText>التقرير الطبي</ListItemText>
          </MenuItem>
        </Menu>
      </Paper>

      {/* Medical action grid */}
      <MedicalActionGrid
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        visit={initialVisit}
      />

      {/* Section content */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {activeSection === 'info' && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <Box sx={{ flex: '0 0 33.33%', minWidth: 0 }}>
              <PatientInfoSection visit={visit} />
            </Box>
            <Box sx={{ flex: '0 0 66.67%', minWidth: 0 }}>
              <FileVisitsSection visit={visit} onSelectVisit={onSelectVisit} />
            </Box>
          </Box>
        )}
        {activeSection === 'diagnosis' && (
          <DiagnosisSection visit={visit} />
        )}
        {activeSection === 'report' && (
          <MedicalReportSection visit={visit} />
        )}
        {activeSection === 'appointments' && (
          <AppointmentSection patientId={patientId} defaultDoctorId={visit?.doctor_id} />
        )}
        {activeSection === 'attachments' && (
          <AttachmentsSection visit={visit} />
        )}
        {activeSection === 'prescriptions' && (
          <PrescriptionsSection visit={visit} />
        )}
        {activeSection === 'services' && (
          <ServicesSection visit={visit} />
        )}
        {activeSection === 'lab' && (
          <LabResultsSection visit={visit} />
        )}
        {activeSection === 'notes' && (
          <VisitNotesSection visit={visit} />
        )}
        {activeSection === 'history' && (
          <MedicalHistorySection
            patientId={patientId}
            medHistory={medHistory}
            isLoading={isLoadingMedHistory}
          />
        )}
        {activeSection === 'vitals' && (
          <VitalsSection
            patientId={patientId}
            visitId={visit?.id}
            medHistory={medHistory}
            isLoading={isLoadingMedHistory}
            isVitalsPinned={isVitalsPinned}
            onToggleVitalsPinned={onToggleVitalsPinned}
          />
        )}
        {activeSection === 'systems' && (
          <SystemsReviewSection
            patientId={patientId}
            medHistory={medHistory}
            isLoading={isLoadingMedHistory}
          />
        )}
        {activeSection === 'teeth' && (
          <TeethSection visit={visit} />
        )}
      </Box>

      <LabReportPdfPreviewDialog
        isOpen={printDialog.open}
        onOpenChange={(open) => {
          setPrintDialog(prev => ({ ...prev, open, url: open ? prev.url : null }));
        }}
        pdfUrl={printDialog.url}
        title={printDialog.title}
        fileName={printDialog.fileName}
        isLoading={printDialog.loading}
      />
    </Box>
  );
};

export default PatientWorkspace;
