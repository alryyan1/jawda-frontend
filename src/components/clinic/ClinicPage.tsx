// src/pages/ClinicPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import './clinicpage.css';

// Import Child Components (we will create/update these)
import DoctorsTabs from '@/components/clinic/DoctorsTabs';
import PatientRegistrationForm from '@/components/clinic/PatientRegistrationForm';
import ActivePatientsList from '@/components/clinic/ActivePatientsList';

import type { Patient } from '@/types/patients'; // Or your more specific ActivePatientListItem
import type { DoctorShift } from '@/types/doctors'; // Assuming a DoctorShift type for Tabs
import ActionsPane from './ActionsPane';
import SelectedPatientWorkspace from './SelectedPatientWorkspace';
import PatientDetailsColumnClinic from './PatientDetailsColumnClinic';
import DoctorFinderDialog from './dialogs/DoctorFinderDialog';

const ClinicPage: React.FC = () => {
  // Removed React Query client; using local refresh key instead
  const [activePatientsRefreshKey, setActivePatientsRefreshKey] = useState(0);
   
  // const {currentClinicShift,isLoadingShift,refetchCurrentClinicShift} = useAuth()
  const [showRegistrationForm, setShowRegistrationForm] = useState(true);
  const [selectedPatientVisit, setSelectedPatientVisit] = useState<{ patient: Patient; visitId: number } | null>(null);
  const [activeDoctorShift, setActiveDoctorShift] = useState<DoctorShift | null>(null); // For DoctorsTabs interaction
  // const [globalSearchTerm, setGlobalSearchTerm] = useState(''); // For patient search - not used yet
 // NEW CALLBACK for DoctorFinderDialog
// NEW: State for DoctorFinderDialog visibility, now controlled by F9 too
const [isDoctorFinderDialogOpen, setIsDoctorFinderDialogOpen] = useState(false);

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
  const handlePatientRegistered = useCallback(() => {
    // Trigger remount of ActivePatientsList to refresh data without React Query
    setActivePatientsRefreshKey(prev => prev + 1);
  }, []);

  const handlePatientSelected = useCallback((patient: Patient, visitId: number) => {
    setSelectedPatientVisit({ patient, visitId });
    setShowRegistrationForm(false); // Hide registration form when a patient is selected
  }, []);

  const toggleRegistrationForm = () => {
    setShowRegistrationForm(prev => !prev);
    if (!showRegistrationForm) { // If we are about to show the form
      setSelectedPatientVisit(null); // Clear selected patient
    }
  };
  
  const onShiftSelect = (shift: DoctorShift | null) => {
    setActiveDoctorShift(shift);
    setShowRegistrationForm(true);
    setSelectedPatientVisit(null); // Clear selected patient
  }
 console.log(activeDoctorShift,'activeDoctorShift',activePatientsRefreshKey,'activePatientsRefreshKey',selectedPatientVisit,'selectedPatientVisit',showRegistrationForm,'showRegistrationForm')

  return (
    <div className="clinic-page-container" dir="rtl">
      {/* Top Section: Doctors Tabs Only */}
      <header className="clinic-header">
        <div className="clinic-header-content">
          <DoctorsTabs 
            setSelectedPatientVisit={setSelectedPatientVisit}
            onShiftSelect={onShiftSelect} 
            activeShiftId={activeDoctorShift?.id || null} 
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`clinic-main-content ${showRegistrationForm ? 'with-registration' : 'without-registration'}`}>
        {/* Section 1: Actions Pane (Fixed width, always visible) */}
      

        {/* Section 2: Patient Registration Form Panel (Conditional Visibility) */}
        {showRegistrationForm && (
          
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
            currentClinicShiftId={activeDoctorShift?.id || null}
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
            />
          </section>
        )}

        {/* Section 5: Patient Details Column (Always visible) */}
       { <section className="clinic-panel details">
          <PatientDetailsColumnClinic
            visitId={selectedPatientVisit?.visitId || null}
            currentClinicShiftId={activeDoctorShift?.id || null}
            onPrintReceipt={() => {
              // Print receipt functionality
            }}
          />
        </section>}

        <ActionsPane
          showRegistrationForm={showRegistrationForm}
          onToggleRegistrationForm={toggleRegistrationForm}
          onOpenDoctorFinderDialog={() => setIsDoctorFinderDialogOpen(true)}
          onDoctorShiftSelectedFromFinder={handleDoctorShiftSelectedFromFinder}
        />
      </div>

      <DoctorFinderDialog
        isOpen={isDoctorFinderDialogOpen}
        onOpenChange={setIsDoctorFinderDialogOpen}
        onDoctorShiftSelect={handleDoctorShiftSelectedFromFinder}
      />
    </div>
  );
};

export default ClinicPage;