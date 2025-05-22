// src/pages/schedules/DoctorSchedulesPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarCog } from 'lucide-react';
import type { DoctorStripped } from '@/types/doctors';
import  { getDoctorsList } from '@/services/doctorService'; // Fetch list of doctors
import DoctorScheduleForm from '@/components/schedules/DoctorScheduleForm';

const DoctorSchedulesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['schedules', 'common']);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const { data: doctors, isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsSimpleListForSchedules'],
    queryFn: () => getDoctorsList(), // Assuming it returns DoctorStripped[] with id and name 
  });

  const selectedDoctor = doctors?.find(doc => String(doc.id) === selectedDoctorId);

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div className="flex items-center gap-2">
             <CalendarCog className="h-7 w-7 text-primary" />
             <h1 className="text-2xl sm:text-3xl font-bold">{t('schedules:pageTitle')}</h1>
         </div>
         {/* Add button for "New Appointment" can go here later */}
      </div>

      <Card>
         <CardHeader>
             <CardTitle>{t('schedules:schedulesTitle')}</CardTitle>
             <CardDescription>{t('schedules:selectDoctorPrompt')}</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
             <div className="max-w-xs">
                 <Select
                     value={selectedDoctorId}
                     onValueChange={setSelectedDoctorId}
                     dir={i18n.dir()}
                     disabled={isLoadingDoctors}
                 >
                     <SelectTrigger>
                     <SelectValue placeholder={t('doctors:form.selectDoctor')} />
                     </SelectTrigger>
                     <SelectContent>
                     {isLoadingDoctors && <SelectItem value="loading" disabled>{t('common:loading')}</SelectItem>}
                     {doctors?.map(doc => (
                         <SelectItem key={doc.id} value={String(doc.id)}>{doc.name}</SelectItem>
                     ))}
                     </SelectContent>
                 </Select>
             </div>

             {selectedDoctor ? (
                 <DoctorScheduleForm selectedDoctor={selectedDoctor} />
             ) : !isLoadingDoctors ? (
                 <p className="text-sm text-muted-foreground">{t('schedules:noDoctorSelected')}</p>
             ) : null}
         </CardContent>
      </Card>
      
      {/* Placeholder for Appointments Section - To be built next */}
      <Card className="mt-8">
         <CardHeader>
             <CardTitle>{t('schedules:appointmentsTitle')}</CardTitle>
             <CardDescription>{t('schedules:appointmentsDescription', "View, book, and manage patient appointments.")}</CardDescription>
         </CardHeader>
         <CardContent>
             <p className="text-muted-foreground text-center py-8">
                 {t('schedules:appointmentsComingSoon', "Appointment management functionality will be implemented here.")}
             </p>
         </CardContent>
      </Card>

    </div>
  );
};
export default DoctorSchedulesPage;