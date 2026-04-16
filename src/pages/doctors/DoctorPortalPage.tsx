import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { Stethoscope } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { getActiveDoctorShifts, getActiveClinicPatients } from '@/services/clinicService';
import type { DoctorShift } from '@/types/doctors';
import type { ActivePatientVisit } from '@/types/patients';

import DoctorPortalHeader from '@/components/doctor-portal/DoctorPortalHeader';
import PatientQueueList from '@/components/doctor-portal/PatientQueueList';
import PatientWorkspace from '@/components/doctor-portal/PatientWorkspace';

const DoctorPortalPage: React.FC = () => {
  const { user, currentClinicShift } = useAuth();

  // Guard: user must be linked to a doctor account
  if (!user?.doctor_id) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Alert severity="warning" sx={{ maxWidth: 480 }}>
          هذا الحساب غير مرتبط بطبيب. يرجى التواصل مع المسؤول لربط الحساب بملف طبيب.
        </Alert>
      </Box>
    );
  }

  // Guard: clinic shift must be open
  if (!currentClinicShift) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 480 }}>
          لا توجد وردية مفتوحة. يرجى فتح وردية الاستقبال أولاً.
        </Alert>
      </Box>
    );
  }

  return <DoctorPortalInner />;
};

// Inner component — rendered only when user.doctor_id and currentClinicShift are present
const DoctorPortalInner: React.FC = () => {
  const { user, currentClinicShift } = useAuth();
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<ActivePatientVisit | null>(null);

  // Query 1: all active doctor shifts for this clinic shift
  const { data: doctorShifts = [] } = useQuery<DoctorShift[]>({
    queryKey: ['activeDoctorShifts', currentClinicShift?.id],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id),
    enabled: !!currentClinicShift?.id,
    refetchInterval: 30_000,
  });

  // Find this doctor's own shift
  const myDoctorShift = useMemo(
    () => doctorShifts.find(s => s.doctor_id === user?.doctor_id) ?? null,
    [doctorShifts, user?.doctor_id]
  );

  // Query 2: patients in this doctor's shift
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<ActivePatientVisit[]>({
    queryKey: ['activePatients', 'doctorPortal', myDoctorShift?.id],
    queryFn: () => getActiveClinicPatients({ doctor_shift_id: myDoctorShift!.id }),
    enabled: !!myDoctorShift?.id,
    refetchInterval: 20_000,
  });

  // Compute stats
  const stats = useMemo(() => ({
    total:     patients.length,
    insurance: patients.filter(p => p.patient?.company_id != null).length,
    cash:      patients.filter(p => p.patient?.company_id == null).length,
  }), [patients]);

  const handleSelectPatient = (visit: ActivePatientVisit) => {
    setSelectedVisitId(visit.id);
    setSelectedVisit(visit);
  };

  // No active shift for this doctor
  if (!myDoctorShift) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DoctorPortalHeader shift={null} stats={{ total: 0, insurance: 0, cash: 0 }} />
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <Alert severity="info" sx={{ maxWidth: 480 }}>
            <Typography fontWeight={600} gutterBottom>لا توجد نوبة طبية نشطة</Typography>
            <Typography variant="body2">
              لم يتم العثور على نوبة طبية مفتوحة لك في هذه الوردية. يرجى طلب فتح نوبة من موظف الاستقبال.
            </Typography>
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 44px)', mt: '-4px', overflow: 'hidden' }}>
      {/* Patient queue (left panel) — full height, starts from top */}
      <PatientQueueList
        patients={patients}
        isLoading={isLoadingPatients}
        selectedVisitId={selectedVisitId}
        onSelectPatient={handleSelectPatient}
      />

      {/* Right side: header + workspace stacked */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <DoctorPortalHeader shift={myDoctorShift} stats={stats} />

        {/* Workspace */}
        <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.default', minHeight: 0 }}>
          {selectedVisitId ? (
            <PatientWorkspace
              visitId={selectedVisitId}
              initialVisit={selectedVisit}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2,
                color: 'text.disabled',
              }}
            >
              <Stethoscope size={56} />
              <Typography variant="h6" color="text.disabled">
                اختر مريضاً من القائمة
              </Typography>
              <Typography variant="body2" color="text.disabled" textAlign="center">
                انقر على أحد المرضى في قائمة الانتظار لعرض ملفه الطبي
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DoctorPortalPage;
