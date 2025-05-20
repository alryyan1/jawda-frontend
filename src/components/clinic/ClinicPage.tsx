// src/pages/ClinicPage.tsx
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from "@/lib/utils"; // For conditional class names

// Import Child Components (we will create/update these)
import DoctorsTabs from '@/components/clinic/DoctorsTabs';
import PatientRegistrationForm from '@/components/clinic/PatientRegistrationForm';
import ActivePatientsList from '@/components/clinic/ActivePatientsList';

import { Input } from '@/components/ui/input';
import {  Search } from 'lucide-react'; // Icons

import type { Patient } from '@/types/patiens'; // Or your more specific ActivePatientListItem
import type { DoctorShift } from '@/types/doctors'; // Assuming a DoctorShift type for Tabs
import ActionsPane from './ActionsPane';
import SelectedPatientWorkspace from './SelectedPatientWorkspace';

const ClinicPage: React.FC = () => {
  const { t, i18n } = useTranslation(['clinic', 'common']);
  const queryClient = useQueryClient();

  const [showRegistrationForm, setShowRegistrationForm] = useState(true);
  const [selectedPatientVisit, setSelectedPatientVisit] = useState<{ patient: Patient; visitId: number } | null>(null);
  const [activeDoctorShift, setActiveDoctorShift] = useState<DoctorShift | null>(null); // For DoctorsTabs interaction
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [currentClinicShiftId, setCurrentClinicShiftId] = useState<number | null>(1); // Example, replace with actual logic

  const handlePatientRegistered = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activePatients', activeDoctorShift?.id /* or global */] });
    // Optionally hide form after registration, or keep it open for next one
    // setShowRegistrationForm(false); 
    // setSelectedPatientVisit(null); // Clear selection if form is shown
  }, [queryClient, activeDoctorShift]);

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
  
  const isRTL = i18n.dir() === 'rtl';

  // Dynamic grid layout based on visibility states
  // This uses CSS Grid for flexible layout
  const gridTemplateColumns = showRegistrationForm 
    ? (isRTL ? "1fr 2fr minmax(350px, 1.5fr) auto" : "auto minmax(350px, 1.5fr) 2fr 1fr")
    : (isRTL ? "1fr 3fr auto" : "auto 3fr 1fr");


  return (
    <div className="flex flex-col h-screen bg-muted/20 dark:bg-background"> {/* Full screen height */}
      {/* Top Section: Doctors Tabs & Global Search */}
      <header className="flex-shrink-0 h-[100px] p-3 border-b bg-card flex items-center gap-4">
        <div className="flex-grow w-2/3 h-full"> {/* Doctors Tabs Area */}
      <DoctorsTabs 
            onShiftSelect={setActiveDoctorShift} 
            activeShiftId={activeDoctorShift?.id || null} 
            currentClinicShiftId={currentClinicShiftId} // Pass if needed by DoctorsTabs
          />
        </div>
        <div className="w-1/3 h-full flex items-center"> {/* Global Search Area */}
          <div className="relative w-full">
            <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('clinic:topNav.searchPatientsPlaceholder')}
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              className="ps-10 rtl:pr-10 h-12 text-base"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area: Actions, Form, Patient List, Selected Patient Workspace */}
      {/* Using CSS Grid for layout */}
      <div 
        className={cn(
            "flex-grow grid gap-0 overflow-hidden",
            // Base layout for LTR. Adjust fr units as needed.
            // "grid-cols-[auto_minmax(350px,1.5fr)_2fr_1fr]",
            // "[column-gap:0px] [row-gap:0px]"
        )}
        style={{ gridTemplateColumns }}
      >
        {/* Section 1: Actions Pane (Fixed width, always visible) */}
         <ActionsPane 
            showRegistrationForm={showRegistrationForm}
            onToggleRegistrationForm={toggleRegistrationForm}
            currentClinicShiftId={currentClinicShiftId} // Pass to dialog
        />


        {/* Section 2: Patient Registration Form Panel (Conditional Visibility) */}
        {showRegistrationForm && (
          <section 
            className={cn(
                "bg-background border-border p-4 overflow-y-auto h-full shadow-lg",
                isRTL ? "border-l order-2" : "border-r order-1"
            )}
          >
             <div className="sticky top-0 bg-background z-10 pt-1 pb-3 mb-3 -mx-4 px-4 border-b">
                <h2 className="text-lg font-semibold text-foreground">
                {t('clinic:patientRegistration.title')}
                </h2>
            </div>
            <PatientRegistrationForm onPatientRegistered={handlePatientRegistered} />
          </section>
        )}

        {/* Section 3: Active Patients List Panel */}
        <section 
            className={cn(
                "p-4 overflow-y-auto h-full bg-muted/40",
                isRTL ? (showRegistrationForm ? "order-3" : "order-2") : (showRegistrationForm ? "order-2" : "order-2"),
            )}
        >
          <div className="sticky top-0 bg-muted/40 dark:bg-background z-10 pt-1 pb-3 mb-3 -mx-4 px-4 border-b">
            <h2 className="text-lg font-semibold text-foreground">
              {t('clinic:workspace.title')}
            </h2>
          </div>
          <ActivePatientsList
            onPatientSelect={handlePatientSelected}
            selectedPatientVisitId={selectedPatientVisit?.visitId || null}
            doctorShiftId={activeDoctorShift?.id || null} // Pass active doctor/shift to filter patients
            globalSearchTerm={globalSearchTerm} // Pass search term
          />
        </section>

        {/* Section 4: Selected Patient Workspace (Conditional Visibility) */}
        {selectedPatientVisit && !showRegistrationForm && (
          <section 
            className={cn(
                "bg-white dark:bg-card border-border p-4 overflow-y-auto h-full shadow-lg",
                isRTL ? "border-r order-4" : "border-l order-3"
            )}
          >
            <SelectedPatientWorkspace
              patient={selectedPatientVisit.patient}
              visitId={selectedPatientVisit.visitId}
              onClose={() => setSelectedPatientVisit(null)} // Optional: way to close this panel
            />
          </section>
        )}
      </div>
      {/* Toaster for notifications */}
    </div>
  );
};

export default ClinicPage;