// src/pages/ClinicPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from "@/lib/utils"; // For conditional class names

// Import Child Components (we will create/update these)
import DoctorsTabs from '@/components/clinic/DoctorsTabs';
import PatientRegistrationForm from '@/components/clinic/PatientRegistrationForm';
import ActivePatientsList from '@/components/clinic/ActivePatientsList';

import { Input } from '@/components/ui/input';
import {   Loader2, Search } from 'lucide-react'; // Icons

import type { Patient } from '@/types/patients'; // Or your more specific ActivePatientListItem
import type { DoctorShift } from '@/types/doctors'; // Assuming a DoctorShift type for Tabs
import ActionsPane from './ActionsPane';
import SelectedPatientWorkspace from './SelectedPatientWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import DoctorFinderDialog from './dialogs/DoctorFinderDialog';
import { toast } from 'sonner';
import { getDoctorVisitById } from '@/services/visitService';

const ClinicPage: React.FC = () => {
  const { t, i18n } = useTranslation(['clinic', 'common']);
  const queryClient = useQueryClient();
   
  // const {currentClinicShift,isLoadingShift,refetchCurrentClinicShift} = useAuth()
  const [showRegistrationForm, setShowRegistrationForm] = useState(true);
  const [selectedPatientVisit, setSelectedPatientVisit] = useState<{ patient: Patient; visitId: number } | null>(null);
  const [activeDoctorShift, setActiveDoctorShift] = useState<DoctorShift | null>(null); // For DoctorsTabs interaction
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
 // NEW CALLBACK for DoctorFinderDialog
 // NEW: State for Visit ID search
 const [visitIdSearchTerm, setVisitIdSearchTerm] = useState('');
 const [isSearchingByVisitId, setIsSearchingByVisitId] = useState(false);
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

// NEW: useEffect for F9 keyboard shortcut
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'F9') {
      event.preventDefault(); // Prevent default F9 browser behavior (if any)
      setIsDoctorFinderDialogOpen(prev => !prev); // Toggle the dialog
    }
  };

  // Add event listener when the component mounts
  document.addEventListener('keydown', handleKeyDown);

  // Clean up event listener when the component unmounts
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount
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
  const onShiftSelect = (shift: DoctorShift) => {
    setActiveDoctorShift(shift);
    setSelectedPatientVisit(null); // Clear selected patient
  }
  // Dynamic grid layout based on visibility states
  // This uses CSS Grid for flexible layout
  const gridTemplateColumns = showRegistrationForm 
    ? (isRTL ? "60px 380px minmax(350px, 1.5fr) auto" : "auto minmax(350px, 1.5fr) 380px 60px")
    : (isRTL ? "60px 380px auto" : "auto 380px 60px");
// NEW: Mutation/Handler for searching by Visit ID
const findVisitByIdMutation = useMutation({
  mutationFn: (id: number) => getDoctorVisitById(id),
  onSuccess: (foundVisit) => {
    if (foundVisit && foundVisit.patient && foundVisit.doctorShift) {
      toast.success(t('clinic:visitFoundById', { visitId: foundVisit.id, patientName: foundVisit.patient.name }));
      setActiveDoctorShift(foundVisit.doctorShift); // Update active doctor shift
      setSelectedPatientVisit({ patient: foundVisit.patient, visitId: foundVisit.id });
      setShowRegistrationForm(false);
      handlePatientSelected(foundVisit.patient, foundVisit.id);
      setGlobalSearchTerm(''); // Clear other search
      setVisitIdSearchTerm(String(foundVisit.id)); // Keep the ID in input for context
    } else {
      toast.error(t('clinic:visitNotFoundById', { visitId: visitIdSearchTerm }));
    }
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.message || t('common:error.fetchFailed'));
  },
  onSettled: () => {
    setIsSearchingByVisitId(false);
  }
});

const handleSearchByVisitId = () => {
  const id = parseInt(visitIdSearchTerm.trim());
  if (isNaN(id) || id <= 0) {
    toast.error(t('clinic:invalidVisitId'));
    return;
  }
  setIsSearchingByVisitId(true);
  findVisitByIdMutation.mutate(id);
};


  return (
    <div className="flex flex-col h-screen bg-muted/20 dark:bg-background"> {/* Full screen height */}
      {/* Top Section: Doctors Tabs Only */}
      <header className="flex-shrink-0 h-[100px] p-3 border-b bg-card flex items-center">
        <div className="flex-grow h-full"> {/* Doctors Tabs Area */}
          <DoctorsTabs 
            setSelectedPatientVisit={setSelectedPatientVisit}
            onShiftSelect={onShiftSelect} 
            activeShiftId={activeDoctorShift?.id || null} 
          />
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
            onOpenDoctorFinderDialog={() => setIsDoctorFinderDialogOpen(true)} 

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
            <PatientRegistrationForm isVisible={showRegistrationForm} activeDoctorShift={activeDoctorShift} onPatientRegistered={handlePatientRegistered} />
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
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-lg font-semibold text-foreground">
                {t('clinic:workspace.title')}
              </h2>
              
              {/* Search Inputs moved here - horizontal layout */}
              <div className="flex gap-2 flex-1 max-w-md">
                {/* Patient Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('clinic:topNav.searchPatientsPlaceholder')}
                    value={globalSearchTerm}
                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                    className="ps-10 rtl:pr-10 h-9 text-sm"
                  />
                </div>
                
                {/* Visit ID Search Input */}
                <div className="relative w-32">
                  <Input
                    type="number"
                    placeholder={t('clinic:searchByVisitIdPlaceholder', "Visit ID...")}
                    value={visitIdSearchTerm}
                    onChange={(e) => { setVisitIdSearchTerm(e.target.value); setGlobalSearchTerm('');}}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchByVisitId(); }}
                    className="ps-10 rtl:pr-10 h-9 text-sm"
                    disabled={isSearchingByVisitId}
                  />
                  <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  {isSearchingByVisitId && <Loader2 className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"/>}
                </div>
              </div>
            </div>
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
            selectedPatientVisit={selectedPatientVisit}
             
              doctorvisit={selectedPatientVisit}
              visitId={selectedPatientVisit.visitId}
              onClose={() => setSelectedPatientVisit(null)} // Optional: way to close this panel
            />
      
          </section>
        )}
      </div>
      <DoctorFinderDialog
        isOpen={isDoctorFinderDialogOpen}
        onOpenChange={setIsDoctorFinderDialogOpen}
        onDoctorShiftSelect={handleDoctorShiftSelectedFromFinder}
      />
      {/* Toaster for notifications */}
    </div>
  );
};

export default ClinicPage;