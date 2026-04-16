import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import { Male, Female } from '@mui/icons-material';
import { getDoctorVisitById } from '@/services/visitService';
import { getMedicalHistory } from '@/services/patientMedicalHistoryService';
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

interface PatientWorkspaceProps {
  visitId: number;
  initialVisit: ActivePatientVisit | null;
}

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  waiting:         { label: 'انتظار',      color: 'info' },
  with_doctor:     { label: 'مع الطبيب',  color: 'warning' },
  lab_pending:     { label: 'مختبر',       color: 'secondary' },
  imaging_pending: { label: 'تصوير',       color: 'secondary' },
  payment_pending: { label: 'دفع',         color: 'warning' },
  completed:       { label: 'مكتملة',      color: 'success' },
  cancelled:       { label: 'ملغاة',       color: 'error' },
  no_show:         { label: 'غائب',        color: 'error' },
};

const PatientWorkspace: React.FC<PatientWorkspaceProps> = ({ visitId, initialVisit }) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('info');

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
  const statusCfg = STATUS_LABELS[visitStatus ?? ''] ?? { label: visitStatus ?? '', color: 'default' as const };

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

        {/* Visit number */}
        <Chip
          label={`زيارة #${visit?.number ?? initialVisit?.number ?? '—'}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.72rem', height: 22 }}
        />

        {/* Status */}
        <Chip
          label={statusCfg.label}
          size="small"
          color={statusCfg.color}
          sx={{ fontSize: '0.72rem', height: 22 }}
        />

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

        {/* New patient badge */}
        {(visit?.is_new ?? initialVisit?.is_new) && (
          <Chip label="جديد" size="small" color="primary" sx={{ fontSize: '0.72rem', height: 22 }} />
        )}

        {/* Loading indicator while visit is fetching in background */}
        {isLoadingVisit && (
          <CircularProgress size={14} sx={{ ml: 'auto' }} />
        )}
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
          <PatientInfoSection visit={visit} />
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
            medHistory={medHistory}
            isLoading={isLoadingMedHistory}
          />
        )}
        {activeSection === 'systems' && (
          <SystemsReviewSection
            patientId={patientId}
            medHistory={medHistory}
            isLoading={isLoadingMedHistory}
          />
        )}
        {activeSection === 'prescriptions' && (
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
            <Typography variant="h6">قريباً</Typography>
            <Typography variant="body2">ميزة الوصفات الطبية قيد التطوير</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PatientWorkspace;
