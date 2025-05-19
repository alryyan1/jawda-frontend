import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query'; // For invalidating queries

import PatientRegistrationForm from '@/components/clinic/PatientRegistrationForm';
import ActivePatientsList from '@/components/clinic/ActivePatientsList';
// import { Separator } from '@/components/ui/separator'; // Optional visual separator

const ClinicPage: React.FC = () => {
  const { t } = useTranslation(['clinic', 'common']);
  const queryClient = useQueryClient();

  // This callback will be passed to PatientRegistrationForm.
  // When a patient is successfully registered, the form will call this.
  const handlePatientRegistered = () => {
    // Invalidate the query for active patients.
    // This will cause ActivePatientsList (if it uses this query key) to refetch.
    queryClient.invalidateQueries(['activePatients']);
  };

  return (
    // The main container for the clinic page, using flexbox for layout.
    // h-[calc(100vh-4rem)] assumes your AppLayout header is 4rem (64px) high.
    // Adjust if your header height is different.
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-muted/40 dark:bg-muted/10">
      
      {/* Right Panel (or Left in LTR): Patient Registration Form */}
      {/* `order-first md:order-last` can be used for RTL to place it on the right */}
      <aside 
        className="w-full md:w-[380px] lg:w-[420px] p-4 sm:p-6 border-border bg-card shadow-lg 
                   overflow-y-auto md:h-full rtl:md:border-r rtl:md:border-l-0 ltr:md:border-l ltr:md:border-r-0"
      >
        <div className="sticky top-0 bg-card z-10 pt-1 pb-3 mb-3 border-b -mx-4 px-4 sm:-mx-6 sm:px-6"> {/* Sticky header for form */}
            <h2 className="text-xl font-semibold text-foreground">
            {t('clinic:patientRegistration.title')}
            </h2>
        </div>
        <PatientRegistrationForm onPatientRegistered={handlePatientRegistered} />
      </aside>

      {/* Optional: Visual separator for larger screens
      <Separator orientation="vertical" className="hidden md:block mx-0 px-0 h-auto" /> 
      */}
      
      {/* Middle/Main Panel: Workspace / Active Patients */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto md:h-full">
        <div className="sticky top-0 bg-muted/40 dark:bg-muted/10 z-10 pt-1 pb-3 mb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b"> {/* Sticky header for list */}
            <h1 className="text-2xl font-bold text-foreground">
            {t('clinic:workspace.title')}
            </h1>
        </div>
        {/* The ActivePatientsList component will fetch and display patients */}
        <ActivePatientsList   />
      </main>
    </div>
  );
};

export default ClinicPage;