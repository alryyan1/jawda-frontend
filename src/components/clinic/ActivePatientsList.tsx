// src/components/clinic/ActivePatientsList.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/types/patiens';

// Mock API - Replace with actual service call
// import { getActivePatients } from '@/services/clinicService';

// --- MOCK Data & Functions (Remove and replace with actual API calls) ---
const mockActivePatients: Patient[] = [
  // Example, ensure structure matches your Patient type after registration
  { id: 101, name: 'علي حسن', phone: '0912345678', gender: 'male', age_year: 30, status: 'waiting', /* ... other fields ... */ created_at: new Date().toISOString(), updated_at: new Date().toISOString(), shift_id: 1, user_id: 1, visit_number:1, result_auth:false,auth_date: new Date().toISOString(), present_complains: '', history_of_present_illness: '', procedures: '', provisional_diagnosis: '', bp: '', temp: 0, weight: 0, height: 0, drug_history: '', family_history: '', rbs: '', care_plan: '', general_examination_notes: '', patient_medical_history: '', social_history: '', allergies: '', general: '', skin: '', head: '', eyes: '', ear: '', nose: '', mouth: '', throat: '', neck: '', respiratory_system: '', cardio_system: '', git_system: '', genitourinary_system: '', nervous_system: '', musculoskeletal_system: '', neuropsychiatric_system: '', endocrine_system: '', peripheral_vascular_system: '', referred: '', discount_comment: '' },
  { id: 102, name: 'سارة محمود', phone: '0987654321', gender: 'female', age_year: 25, status: 'with_doctor', /* ... */ created_at: new Date().toISOString(), updated_at: new Date().toISOString(), shift_id: 1, user_id: 1, visit_number:1, result_auth:false,auth_date: new Date().toISOString(), present_complains: '', history_of_present_illness: '', procedures: '', provisional_diagnosis: '', bp: '', temp: 0, weight: 0, height: 0, drug_history: '', family_history: '', rbs: '', care_plan: '', general_examination_notes: '', patient_medical_history: '', social_history: '', allergies: '', general: '', skin: '', head: '', eyes: '', ear: '', nose: '', mouth: '', throat: '', neck: '', respiratory_system: '', cardio_system: '', git_system: '', genitourinary_system: '', nervous_system: '', musculoskeletal_system: '', neuropsychiatric_system: '', endocrine_system: '', peripheral_vascular_system: '', referred: '', discount_comment: '' },
];

const getActivePatients = async (): Promise<Patient[]> => {
    console.log("Fetching active patients...");
    return new Promise(resolve => setTimeout(() => {
        // In a real app, you'd filter or fetch based on criteria
        resolve([...mockActivePatients]);
    }, 700));
};
// --- END MOCK ---

interface ActivePatientsListProps {
  newPatientTrigger: Patient | null; // Trigger to refetch when a new patient is added
}

const ActivePatientsList: React.FC<ActivePatientsListProps> = ({ newPatientTrigger }) => {
  const { t } = useTranslation(['clinic', 'common']);
  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const patients = await getActivePatients(); // Replace with actual API call
        // Example: if newPatientTrigger is used to add to list directly without refetching
        // This is a simple way, React Query's query invalidation is more robust
        if (newPatientTrigger && !patients.find(p => p.id === newPatientTrigger.id)) {
             setActivePatients(prev => [newPatientTrigger, ...prev]); // Add to top
        } else {
            setActivePatients(patients);
        }

      } catch (error) {
        console.error("Failed to fetch active patients", error);
        // toast.error(t('common:error.fetchFailed', "Failed to fetch active patients."));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [newPatientTrigger, t]); // Refetch when newPatientTrigger changes or t function (language) changes

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (activePatients.length === 0) {
    return <p className="text-muted-foreground">{t('clinic:workspace.noActivePatients')}</p>;
  }

  return (
    <ScrollArea className="h-[calc(100%-3.5rem)]"> {/* Adjust height as needed */}
      <div className="space-y-3">
        {activePatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg flex justify-between items-center">
                {patient.name}
                {patient.status && <Badge variant={patient.status === 'waiting' ? 'outline' : 'default'}>{t(`clinic:workspace.${patient.status}`)}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p><strong>{t('clinic:patientRegistration.phoneLabel')}:</strong> {patient.phone}</p>
              <p>
                <strong>{t('clinic:patientRegistration.ageLabel')}:</strong> 
                {patient.age_year || 0} {t('common:years_short', 'Y')} / {patient.age_month || 0} {t('common:months_short', 'M')} / {patient.age_day || 0} {t('common:days_short', 'D')}
              </p>
              {/* Add more details or actions here */}
              {/* Example Action Button */}
              {/* <Button size="sm" variant="outline" className="mt-2">View Details</Button> */}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ActivePatientsList;