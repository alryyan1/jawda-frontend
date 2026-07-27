import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { Stethoscope } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { getActiveDoctorShifts, getActiveClinicPatients } from '@/services/clinicService';
import realtimeService from '@/services/realtimeService';
import type { DoctorShift } from '@/types/doctors';
import type { ActivePatientVisit, Patient } from '@/types/patients';

import DoctorPortalHeader from '@/components/doctor-portal/DoctorPortalHeader';
import PatientQueueList from '@/components/doctor-portal/PatientQueueList';
import PatientWorkspace from '@/components/doctor-portal/PatientWorkspace';
import PinnedVitalsPanel from '@/components/doctor-portal/PinnedVitalsPanel';

const NEW_PATIENT_HIGHLIGHT_MS = 30_000;

// The realtime `patient-registered` payload is a full PatientResource with a
// nested DoctorVisitResource — a different (richer, but partly non-overlapping)
// shape than the lean DoctorVisitListItemResource the queue's own query returns.
// This maps the socket payload down to the same ActivePatientVisit shape so it
// can be spliced straight into the query cache without a refetch. Fields the
// socket payload doesn't carry (e.g. file_id) are left at a safe default and
// get filled in by the next background poll.
const buildActivePatientVisitFromRealtimePatient = (
  patient: Patient,
  fallbackDoctorShiftId?: number
): ActivePatientVisit | null => {
  const visit = patient.doctor_visit;
  if (!visit) {
    return null;
  }

  const fullAge = (patient as Patient & { full_age?: string }).full_age ?? '';

  return {
    id: visit.id,
    number: visit.number,
    queue_number: visit.queue_number ?? null,
    status: (visit.status as ActivePatientVisit['status']) ?? 'waiting',
    is_online: false,
    is_new: visit.is_new ?? true,
    only_lab: visit.only_lab ?? false,
    balance_due: visit.balance_due ?? 0,
    requested_services_count: visit.requested_services_count ?? 0,
    lab_requests_count: 0,
    has_lab_requests: false,
    result_auth: false,
    doctor_id: visit.doctor_id,
    doctor_shift_id: visit.doctor_shift_id ?? fallbackDoctorShiftId ?? 0,
    file_id: null,
    file_visits_count: 0,
    company: patient.company ? { id: patient.company.id, name: patient.company.name } : null,
    patient: {
      id: patient.id,
      name: patient.name,
      phone: patient.phone ?? null,
      gender: patient.gender,
      age_year: patient.age_year ?? null,
      age_month: patient.age_month ?? null,
      age_day: patient.age_day ?? null,
      full_age: fullAge,
      company_id: patient.company_id ?? null,
      company: patient.company
        ? { id: patient.company.id, name: patient.company.name, status: patient.company.status }
        : null,
    },
  };
};

const DoctorPortalPage: React.FC = () => {
  const { user, currentClinicShift } = useAuth();

  // Guard: user must be linked to a doctor account
  if (!user?.doctor_id) {
    return (
      <Box sx={{ minHeight: '100vh', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="warning" sx={{ maxWidth: 480 }}>
          هذا الحساب غير مرتبط بطبيب. يرجى التواصل مع المسؤول لربط الحساب بملف طبيب.
        </Alert>
      </Box>
    );
  }

  // Guard: clinic shift must be open
  if (!currentClinicShift) {
    return (
      <Box sx={{ minHeight: '100vh', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  const queryClient = useQueryClient();
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<ActivePatientVisit | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  // Pins the "current visit" vitals form as a side panel (opposite the queue)
  // so it stays reachable while browsing other workspace tabs. Pinned by
  // default — unpinning is the opt-out, not the opt-in.
  const [isVitalsPinned, setIsVitalsPinned] = useState(true);
  const isToday = selectedDate === dayjs().format('YYYY-MM-DD');

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

  // Query 2: all of this doctor's patients for the selected day (default: today),
  // across every doctor-shift session they may have opened/closed/reopened that
  // day — not just the one currently-open shift. PatientQueueList groups them by
  // doctor_shift_id. Only auto-refetches while looking at today (a past day's
  // patient list won't change).
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<ActivePatientVisit[]>({
    queryKey: ['activePatients', 'doctorPortal', user?.doctor_id, selectedDate],
    queryFn: () => getActiveClinicPatients({ doctor_id: user!.doctor_id!, date: selectedDate }),
    enabled: !!user?.doctor_id,
    refetchInterval: isToday ? 20_000 : false,
  });

  // Visit ids that just got spliced into the queue via realtime — used to
  // flash an entrance animation + a pulsing "new" dot on their card for a
  // few seconds, then fall back to a plain list item.
  const [newlyAddedVisitIds, setNewlyAddedVisitIds] = useState<Set<number>>(new Set());
  const newlyAddedTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const flagVisitAsNew = useCallback((visitId: number) => {
    setNewlyAddedVisitIds(prev => new Set(prev).add(visitId));

    const existingTimeout = newlyAddedTimeoutsRef.current.get(visitId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const timeout = setTimeout(() => {
      setNewlyAddedVisitIds(prev => {
        const next = new Set(prev);
        next.delete(visitId);
        return next;
      });
      newlyAddedTimeoutsRef.current.delete(visitId);
    }, NEW_PATIENT_HIGHLIGHT_MS);
    newlyAddedTimeoutsRef.current.set(visitId, timeout);
  }, []);

  useEffect(() => {
    const timeouts = newlyAddedTimeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  const playNewPatientSound = useCallback(() => {
    try {
      const audio = new Audio('/new-payment.mp3');
      audio.volume = 0.6;
      void audio.play().catch(() => {
        // Autoplay can be blocked until the user interacts with the page — safe to ignore.
      });
    } catch {
      // Ignore environments without Audio support.
    }
  }, []);

  const playResultsReadySound = useCallback(() => {
    try {
      const audio = new Audio('/new-payment.mp3');
      audio.volume = 0.6;
      void audio.play().catch(() => {
        // Autoplay can be blocked until the user interacts with the page — safe to ignore.
      });
    } catch {
      // Ignore environments without Audio support.
    }
  }, []);

  // Realtime: a new patient registered for this doctor is spliced straight
  // into the cached queue (no refetch), with a highlight + sound cue.
  useEffect(() => {
    const handlePatientRegistered = (patient: Patient): void => {
      const visit = patient.doctor_visit;
      if (!visit || visit.doctor_id !== user?.doctor_id) {
        return;
      }
      // Only splice into the currently-viewed day's queue
      if (visit.visit_date && visit.visit_date !== selectedDate) {
        return;
      }

      const newVisit = buildActivePatientVisitFromRealtimePatient(patient, myDoctorShift?.id);
      if (!newVisit) {
        return;
      }

      const queryKey = ['activePatients', 'doctorPortal', user?.doctor_id, selectedDate] as const;
      let wasAdded = false;
      queryClient.setQueryData<ActivePatientVisit[]>(queryKey, old => {
        if (!old) {
          return old;
        }
        if (old.some(v => v.id === newVisit.id)) {
          return old;
        }
        wasAdded = true;
        return [newVisit, ...old];
      });

      if (wasAdded) {
        flagVisitAsNew(newVisit.id);
        playNewPatientSound();
      }
    };

    realtimeService.onPatientRegistered(handlePatientRegistered);
    return () => {
      realtimeService.offPatientRegistered(handlePatientRegistered);
    };
  }, [queryClient, user?.doctor_id, selectedDate, myDoctorShift?.id, flagVisitAsNew, playNewPatientSound]);

  // Realtime: the lab authorized a patient's results — flag the visit as
  // "results ready" in the queue cache (drives the FlaskConical badge on the
  // card) and play a sound cue, mirroring the new-patient splice pattern above.
  useEffect(() => {
    const handleResultsAuthenticated = (data: {
      visit_id: number;
      patient_id: number;
      doctor_id: number;
      patient_name: string;
      file_id: number | null;
    }): void => {
      if (data.doctor_id !== user?.doctor_id) {
        return;
      }

      const queryKey = ['activePatients', 'doctorPortal', user?.doctor_id, selectedDate] as const;
      let wasUpdated = false;
      queryClient.setQueryData<ActivePatientVisit[]>(queryKey, old => {
        if (!old) {
          return old;
        }
        return old.map(v => {
          if (v.id !== data.visit_id) {
            return v;
          }
          wasUpdated = true;
          return { ...v, result_auth: true, has_lab_requests: true };
        });
      });

      if (wasUpdated) {
        flagVisitAsNew(data.visit_id);
        playResultsReadySound();
      }
    };

    realtimeService.onPatientResultsAuthenticated(handleResultsAuthenticated);
    return () => {
      realtimeService.offPatientResultsAuthenticated(handleResultsAuthenticated);
    };
  }, [queryClient, user?.doctor_id, selectedDate, flagVisitAsNew, playResultsReadySound]);

  // Realtime: reflect this doctor's shift being opened (e.g. by reception,
  // including reopening a previously closed one) right away, rather than
  // waiting for the next 30s shift poll.
  useEffect(() => {
    const handleDoctorShiftOpened = (data: { doctor_shift: DoctorShift }): void => {
      queryClient.setQueryData<DoctorShift[]>(
        ['activeDoctorShifts', currentClinicShift?.id],
        oldData => {
          if (!oldData) {
            return oldData;
          }
          if (oldData.some(shift => shift.id === data.doctor_shift.id)) {
            return oldData.map(shift => (shift.id === data.doctor_shift.id ? data.doctor_shift : shift));
          }
          return [...oldData, data.doctor_shift];
        }
      );
    };

    realtimeService.onDoctorShiftOpened(handleDoctorShiftOpened);
    return () => {
      realtimeService.offDoctorShiftOpened(handleDoctorShiftOpened);
    };
  }, [queryClient, currentClinicShift?.id]);

  // Realtime: reflect this doctor's shift being closed (e.g. by reception)
  // right away, rather than waiting for the next 30s shift poll.
  useEffect(() => {
    const handleDoctorShiftClosed = (data: { doctor_shift: DoctorShift }): void => {
      queryClient.setQueryData<DoctorShift[]>(
        ['activeDoctorShifts', currentClinicShift?.id],
        oldData => oldData?.filter(shift => shift.id !== data.doctor_shift.id)
      );
    };

    realtimeService.onDoctorShiftClosed(handleDoctorShiftClosed);
    return () => {
      realtimeService.offDoctorShiftClosed(handleDoctorShiftClosed);
    };
  }, [queryClient, currentClinicShift?.id]);

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

  // Selecting a visit found via the "previous visits" history search — we only
  // have the visit id at that point, so PatientWorkspace fetches everything
  // else itself (no initialVisit snapshot to fall back on).
  const handleSelectVisitId = (visitId: number) => {
    setSelectedVisitId(visitId);
    setSelectedVisit(null);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden',userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Patient queue (left panel) — full height, starts from top */}
      <PatientQueueList
        patients={patients}
        isLoading={isLoadingPatients}
        selectedVisitId={selectedVisitId}
        onSelectPatient={handleSelectPatient}
        onSelectVisitId={handleSelectVisitId}
        doctorShifts={doctorShifts}
        activeDoctorShiftId={myDoctorShift?.id}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        newlyAddedVisitIds={newlyAddedVisitIds}
      />

      {/* Right side: header + workspace stacked */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <DoctorPortalHeader
          shift={myDoctorShift}
          stats={stats}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        {/* Workspace */}
        <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.default', minHeight: 0 }}>
          {selectedVisitId ? (
            <PatientWorkspace
              key={selectedVisitId}
              visitId={selectedVisitId}
              initialVisit={selectedVisit}
              isVitalsPinned={isVitalsPinned}
              onToggleVitalsPinned={() => setIsVitalsPinned(p => !p)}
              onSelectVisit={handleSelectVisitId}
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

      {/* Pinned vitals panel (opposite end from the queue) — only when pinned and a visit is open */}
      {isVitalsPinned && selectedVisitId && (
        <PinnedVitalsPanel
          key={selectedVisitId}
          visitId={selectedVisitId}
          initialVisit={selectedVisit}
          onUnpin={() => setIsVitalsPinned(false)}
        />
      )}
    </Box>
  );
};

export default DoctorPortalPage;
