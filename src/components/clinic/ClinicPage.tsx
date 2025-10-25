// src/pages/ClinicPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import './clinicpage.css';

// Import Child Components (we will create/update these)
import DoctorsTabs from '@/components/clinic/DoctorsTabs';
import PatientRegistrationForm from '@/components/clinic/PatientRegistrationForm';
import ActivePatientsList from '@/components/clinic/ActivePatientsList';

import type { Patient } from '@/types/patients'; // Or your more specific ActivePatientListItem
import { useClinicSelection } from '@/contexts/ClinicSelectionContext';
import type { DoctorShift } from '@/types/doctors'; // Assuming a DoctorShift type for Tabs
import { useAuth } from '@/contexts/AuthContext';
import realtimeService from '@/services/realtimeService';
import ActionsPane from './ActionsPane';
import SelectedPatientWorkspace from './SelectedPatientWorkspace';
import PatientDetailsColumnClinic, { type PatientDetailsColumnClinicRef } from './PatientDetailsColumnClinic';
import DoctorFinderDialog from './dialogs/DoctorFinderDialog';
import UserShiftIncomeDialog from './UserShiftIncomeDialog';
import ClinicFinancialSummary from './ClinicFinancialSummary';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

const ClinicPage: React.FC = () => {
  const { requestSelection } = useClinicSelection();
  // Removed React Query client; using local refresh key instead
  const [activePatientsRefreshKey, setActivePatientsRefreshKey] = useState(0);

  const { currentClinicShift, user } = useAuth();
  const isUnifiedCashier = (user?.user_type || '').trim() === 'خزنه موحده';
  const DETAILS_COLLAPSE_KEY = 'clinic_patient_details_collapsed';
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(DETAILS_COLLAPSE_KEY);
    if (saved === 'true' || saved === 'false') return saved === 'true';
    return isUnifiedCashier ? true : false; // default collapsed for unified cashier, otherwise expanded
  });

  useEffect(() => {
    localStorage.setItem(DETAILS_COLLAPSE_KEY, String(isDetailsCollapsed));
  }, [isDetailsCollapsed]);

  const toggleDetailsCollapsed = () => {
    if (!isUnifiedCashier) return; // Only collapsible for unified cashier
    setIsDetailsCollapsed((prev) => !prev);
  };
  const [showRegistrationForm, setShowRegistrationForm] = useState(true);
  const [selectedPatientVisit, setSelectedPatientVisit] = useState<{ patient: Patient; visitId: number } | null>(null);
  const [activeDoctorShift, setActiveDoctorShift] = useState<DoctorShift | null>(null); // For DoctorsTabs interaction
  // const [globalSearchTerm, setGlobalSearchTerm] = useState(''); // For patient search - not used yet
  // NEW CALLBACK for DoctorFinderDialog
  // NEW: State for DoctorFinderDialog visibility, now controlled by F9 too
  const [isDoctorFinderDialogOpen, setIsDoctorFinderDialogOpen] = useState(false);
  // NEW: State for UserShiftIncomeDialog visibility, controlled by F8
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  // NEW: State for ClinicFinancialSummary dialog visibility
  const [isFinancialSummaryDialogOpen, setIsFinancialSummaryDialogOpen] = useState(false);
  // NEW: State for responsive behavior
  const [isScreenSmall, setIsScreenSmall] = useState(false);
  const [isPatientDetailsDialogOpen, setIsPatientDetailsDialogOpen] = useState(false);
  const patientDetailsRef = React.useRef<PatientDetailsColumnClinicRef>(null);

  const handleDoctorShiftSelectedFromFinder = useCallback((shift: DoctorShift) => {
    setActiveDoctorShift(shift);
    setIsDoctorFinderDialogOpen(false); // Close dialog after selection
    // If registration form is not the primary focus after finder, you might show it:
    // if (!showRegistrationForm) {
    //   setShowRegistrationForm(true);
    //   setSelectedPatientVisit(null);
    // }
    // Or focus on patient registration name input if form is already visible
    // This depends on desired UX flow after selecting a doctor via F9
  }, [/* showRegistrationForm, setShowRegistrationForm, setSelectedPatientVisit */]);

  // Empty dependency array means this effect runs once on mount and cleans up on unmount
  const handlePatientRegistered = useCallback((patient: Patient) => {
    // Refresh active patients list
    setActivePatientsRefreshKey(prev => prev + 1);
    // If backend returned the created visit on the patient, auto-select it
    const visitId = patient.doctor_visit?.id;
    if (visitId) {
      setSelectedPatientVisit({ patient, visitId });
      setShowRegistrationForm(false);
    }
    // Backend queues a welcome SMS job; show user feedback
    if (patient.phone) {
      toast.success('تمت جدولة رسالة ترحيب للمريض');
    }
  }, []);

  const handlePatientSelected = useCallback((patient: Patient, visitId: number) => {
    setSelectedPatientVisit({ patient, visitId });
    setShowRegistrationForm(false); // Hide registration form when a patient is selected
  }, []);

  const toggleRegistrationForm = () => {
    if (isUnifiedCashier) return; // Prevent showing for unified cashier users
    setShowRegistrationForm(prev => !prev);
    if (!showRegistrationForm) { // If we are about to show the form
      setSelectedPatientVisit(null); // Clear selected patient
    }
  };

  const onShiftSelect = (shift: DoctorShift | null) => {
    setActiveDoctorShift(shift);
    setShowRegistrationForm(isUnifiedCashier ? false : true);
    setSelectedPatientVisit(null); // Clear selected patient
  }

  const handleDoctorShiftClosed = (doctorShiftId: number) => {
    console.log('doctor shift closed', doctorShiftId);
    console.log('active doctor shift', activeDoctorShift);
    // If the closed shift is the currently active one, deselect it
    if (activeDoctorShift?.id === doctorShiftId) {
      // alert('doctor shift closed');
      setActiveDoctorShift(null);
      setSelectedPatientVisit(null); // Clear selected patient
      setShowRegistrationForm(false); // Hide registration form
    }
  };

  // Ensure the registration form remains hidden for unified cashier users
  useEffect(() => {
    if (isUnifiedCashier && showRegistrationForm) {
      setShowRegistrationForm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnifiedCashier]);

  // Responsive behavior for screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsScreenSmall(window.innerWidth < 1400);
    };

    // Check initial size
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  // F8 and F10 keyboard listeners
  // F8: Open income dialog, F10: Open doctor finder dialog
  useEffect(() => {
    // Expose selection handler to the header search when clinic page is active
    requestSelection({
      onSelect: (patient, visitId, doctorShift) => {
        setSelectedPatientVisit({ patient, visitId });
        setShowRegistrationForm(false);

        // If the patient is from the current shift and the doctor shift is currently open,
        // set that doctor shift as active
        if (doctorShift) {
          setActiveDoctorShift(doctorShift);
        }
      }
    });
    return () => requestSelection(null);
  }, [requestSelection]);

  // F8 and F10 keyboard listeners
  // F8: Open income dialog, F10: Open doctor finder dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F8') {
        event.preventDefault();
        setIsIncomeDialogOpen(true);
      } else if (event.key === 'F10') {
        event.preventDefault();
        setIsDoctorFinderDialogOpen(true);
      } else if (event.key === 'Enter') {
        if (selectedPatientVisit && !showRegistrationForm) {
          const target = event.target as HTMLElement | null;
          const isTextInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true');
          if (!isTextInput) {
            event.preventDefault();
            patientDetailsRef.current?.triggerPayAll();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPatientVisit, showRegistrationForm]);

  // Subscribe to realtime patient-registered events
  useEffect(() => {
    const handleRealtimePatientRegistered = (patient: Patient) => {
      console.log('Realtime patient registered:', patient);

      // Check if the patient belongs to the current doctor shift
      if (activeDoctorShift && patient.doctor_visit?.doctor_shift_id === activeDoctorShift.id) {
        // Refresh the active patients list
        setActivePatientsRefreshKey(prev => prev + 1);

        // Optionally auto-select the new patient
        const visitId = patient.doctor_visit?.id;
        if (visitId) {
          setSelectedPatientVisit({ patient, visitId });
          setShowRegistrationForm(false);
        }
      }
    };

    // Subscribe to the event
    realtimeService.onPatientRegistered(handleRealtimePatientRegistered);

    // Cleanup on unmount
    return () => {
      realtimeService.offPatientRegistered(handleRealtimePatientRegistered);
    };
  }, [activeDoctorShift]);


  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'services' | 'lab'>('services');

  // Shift status dialog state
  const [isShiftStatusDialogOpen, setIsShiftStatusDialogOpen] = useState(false);
  const [shiftStatusMessage, setShiftStatusMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);

  // Subscribe to open/close general shift realtime events
  useEffect(() => {
    const handleOpen = (data: { user_name?: string }) => {
      setShiftStatusMessage(`تم فتح الوردية بواسطة ${data.user_name || 'مستخدم'}. سيتم تحديث الصفحة خلال 3 ثوانٍ.`);
      setIsShiftStatusDialogOpen(true);
      setCountdown(3);
    };
    const handleClose = (data: { user_name?: string }) => {
      setShiftStatusMessage(`تم إغلاق الوردية بواسطة ${data.user_name || 'مستخدم'}. سيتم تحديث الصفحة خلال 3 ثوانٍ.`);
      setIsShiftStatusDialogOpen(true);
      setCountdown(3);
    };

    realtimeService.onOpenGeneralShift(handleOpen);
    realtimeService.onCloseGeneralShift(handleClose);

    return () => {
      realtimeService.offOpenGeneralShift(handleOpen);
      realtimeService.offCloseGeneralShift(handleClose);
    };
  }, []);

  // Countdown and reload effect when dialog opens
  useEffect(() => {
    if (!isShiftStatusDialogOpen) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          // Reload the page
          window.location.reload();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isShiftStatusDialogOpen]);

  return (
    <div className='flex justify-between'>  <div className="clinic-page-container" dir="rtl">
      {/* Top Section: Doctors Tabs Only */}
      <header style={{width:`${window.innerWidth -140}px`}} className="clinic-header">
        <div className="clinic-header-content">
          <DoctorsTabs
            setSelectedPatientVisit={setSelectedPatientVisit}
            onShiftSelect={onShiftSelect}
            activeShiftId={activeDoctorShift?.id || null}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`clinic-main-content ${showRegistrationForm ? 'with-registration' : 'without-registration'} ${selectedPatientVisit ? '' : ' without-patient-selected'}`}>
        {/* Section 1: Actions Pane (Fixed width, always visible) */}


        {/* Section 2: Patient Registration Form Panel (Conditional Visibility) */}
        {showRegistrationForm && !isUnifiedCashier && (

          <PatientRegistrationForm
            isVisible={showRegistrationForm}
            activeDoctorShift={activeDoctorShift}
            onPatientRegistered={handlePatientRegistered}
          />
        )}

        {/* Section 3: Active Patients List Panel */}
        <section className="clinic-panel workspace">
          <ActivePatientsList
            key={activePatientsRefreshKey}
            onPatientSelect={handlePatientSelected}
            selectedPatientVisitId={selectedPatientVisit?.visitId || null}
            doctorShiftId={activeDoctorShift?.id || null}
          />
        </section>

        {/* Section 4: Selected Patient Workspace (Conditional Visibility) */}
        {selectedPatientVisit && !showRegistrationForm && (
          <section className="clinic-panel patient-workspace">
            <SelectedPatientWorkspace
              selectedPatientVisit={{
                id: selectedPatientVisit.visitId,
                patient_id: selectedPatientVisit.patient.id,
                doctor_id: activeDoctorShift?.doctor_id || 0,
                user_id: 0,
                shift_id: 0,
                visit_date: new Date().toISOString().split('T')[0],
                status: 'waiting',
                number: selectedPatientVisit.visitId,
                is_new: false,
                only_lab: false,
                patient: selectedPatientVisit.patient,
                doctor: activeDoctorShift ? { id: activeDoctorShift.doctor_id || 0, name: activeDoctorShift.doctor_name || '' } : undefined,
                requested_services: [],
                requested_services_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }}
              initialPatient={selectedPatientVisit.patient}
              visitId={selectedPatientVisit.visitId}
              onClose={() => setSelectedPatientVisit(null)}
              onActiveTabChange={(tab) => setActiveWorkspaceTab(tab)}
            />
          </section>
        )}

        {/* Section 5: Patient Details Column (Collapsible for unified cashier) - Only show on large screens */}
        {!isScreenSmall && (
          <section className={`clinic-panel details ${isUnifiedCashier && isDetailsCollapsed ? 'collapsed' : ''}`}>
            <PatientDetailsColumnClinic
              ref={patientDetailsRef}
              visitId={selectedPatientVisit?.visitId || null}
              currentClinicShiftId={activeDoctorShift?.id || null}
              activeTab={activeWorkspaceTab}
              onPrintReceipt={() => {
                // Print receipt functionality
              }}
            />
          </section>
        )}

        {isUnifiedCashier && (
          <button
            type="button"
            onClick={toggleDetailsCollapsed}
            className="details-toggle-btn"
            aria-label={isDetailsCollapsed ? 'إظهار تفاصيل المريض' : 'إخفاء تفاصيل المريض'}
            title={isDetailsCollapsed ? 'إظهار تفاصيل المريض' : 'إخفاء تفاصيل المريض'}
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              zIndex: 50,
              padding: '6px 10px',
              background: 'var(--primary, #0ea5e9)',
              color: '#fff',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isDetailsCollapsed ? 'عرض التفاصيل' : 'إخفاء التفاصيل'}
          </button>
        )}

   
      </div>

      <DoctorFinderDialog
        isOpen={isDoctorFinderDialogOpen}
        onOpenChange={setIsDoctorFinderDialogOpen}
        onDoctorShiftSelect={handleDoctorShiftSelectedFromFinder}
      />

      {currentClinicShift && (
        <UserShiftIncomeDialog
          isOpen={isIncomeDialogOpen}
          onOpenChange={setIsIncomeDialogOpen}
          currentClinicShiftId={currentClinicShift?.id ?? null}
        />
      )}

      {/* Financial Summary Dialog */}
      <Dialog open={isFinancialSummaryDialogOpen} onOpenChange={setIsFinancialSummaryDialogOpen}>
        <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] ">
          <DialogHeader>

          </DialogHeader>
          <ClinicFinancialSummary currentClinicShiftId={currentClinicShift?.id ?? null} />
        </DialogContent>
      </Dialog>

      {/* Shift Status Dialog */}
      <Dialog open={isShiftStatusDialogOpen} onOpenChange={setIsShiftStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حالة الوردية</DialogTitle>
            <DialogDescription>
              {shiftStatusMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center text-sm text-muted-foreground mt-2">
            سيتم إعادة تحميل الصفحة خلال {countdown} ثانية...
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Details Dialog for small screens */}
      <Dialog open={isPatientDetailsDialogOpen} onOpenChange={setIsPatientDetailsDialogOpen}>
        <DialogContent className="!max-w-md max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle>تفاصيل المريض</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <PatientDetailsColumnClinic
              ref={patientDetailsRef}
              visitId={selectedPatientVisit?.visitId || null}
              currentClinicShiftId={activeDoctorShift?.id || null}
              activeTab={activeWorkspaceTab}
              onPrintReceipt={() => {
                // Print receipt functionality
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Button for Patient Details (only on small screens) */}
      {isScreenSmall && selectedPatientVisit && (
        <Button
          onClick={() => setIsPatientDetailsDialogOpen(true)}
          className="fixed bottom-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          size="icon"
        >
          <FileText className="h-5 w-5" />
        </Button>
      )}
    </div>
    <ActionsPane
          activeDoctorShift={activeDoctorShift}
          showRegistrationForm={showRegistrationForm}
          onToggleRegistrationForm={toggleRegistrationForm}
          onDoctorShiftSelectedFromFinder={handleDoctorShiftSelectedFromFinder}
          onDoctorShiftClosed={handleDoctorShiftClosed}
          onOpenFinancialSummary={() => setIsFinancialSummaryDialogOpen(true)}
        /></div>

  );
};

export default ClinicPage;