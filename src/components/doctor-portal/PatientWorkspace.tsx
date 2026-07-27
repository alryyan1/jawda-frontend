import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import { Male, Female } from '@mui/icons-material';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { getDoctorVisitById } from '@/services/visitService';
import { getMedicalHistory } from '@/services/patientMedicalHistoryService';
import { getVisitSummaryPdfUrl } from '@/services/visitSummaryService';
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
  const [summaryPdfUrl, setSummaryPdfUrl] = useState<string | null>(null);
  const [isSummaryPdfOpen, setIsSummaryPdfOpen] = useState(false);
  const [isSummaryPdfLoading, setIsSummaryPdfLoading] = useState(false);

  const handlePrintSummary = async () => {
    setIsSummaryPdfOpen(true);
    setIsSummaryPdfLoading(true);
    try {
      const url = await getVisitSummaryPdfUrl(visitId);
      setSummaryPdfUrl(url);
    } catch {
      toast.error('فشل إنشاء ملخص الزيارة');
      setIsSummaryPdfOpen(false);
    } finally {
      setIsSummaryPdfLoading(false);
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
          gap: 2,
          flexWrap: 'wrap',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        {/* Gender icon + Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {patient?.gender === 'male' ? (
            <Male sx={{ color: 'info.main', fontSize: 20 }} />
          ) : (
            <Female sx={{ color: 'error.light', fontSize: 20 }} />
          )}
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
          onClick={handlePrintSummary}
        >
          طباعة ملخص الزيارة
        </Button>
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
        isOpen={isSummaryPdfOpen}
        onOpenChange={(open) => {
          setIsSummaryPdfOpen(open);
          if (!open) setSummaryPdfUrl(null);
        }}
        pdfUrl={summaryPdfUrl}
        title="ملخص الزيارة"
        fileName={`visit-summary-${visitId}.pdf`}
        isLoading={isSummaryPdfLoading}
      />
    </Box>
  );
};

export default PatientWorkspace;
