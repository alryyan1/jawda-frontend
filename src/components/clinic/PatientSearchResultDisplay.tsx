// src/components/clinic/PatientSearchResultDisplay.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PatientSearchResult } from '@/types/patients';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Phone, Calendar, Stethoscope, SaveAll } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

interface PatientSearchResultDisplayProps {
  results: PatientSearchResult[];
  onSelectPatientVisit: (patientId: number, previousVisitId?: number | null, previousFileId?: number | null) => void;
  isLoading: boolean;
}

const PatientSearchResultDisplay: React.FC<PatientSearchResultDisplayProps> = ({ results, onSelectPatientVisit, isLoading }) => {
  const dateLocale = "ar".startsWith('ar') ? arSA : enUS;

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">جاري البحث...</div>;
  }
  if (results.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">لا توجد نتائج</div>;
  }

  return (
    <ScrollArea  className="h-[600px]  shadow-xl "> {/* Limit height and make scrollable */}
      <div className="space-y-2 p-1">
        {results.map(patient => (
          <Card key={patient.id} className="p-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-primary"/>{patient.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3"/>{patient.phone || '-'}
                </p>
                {patient.last_visit_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3"/>
                    التاريخ: {format(patient.last_visit_date, 'P', {locale: dateLocale})}
                  </p>
                )}
                {patient.last_visit_doctor_name && (
                   <p className="text-xs text-muted-foreground flex items-center gap-1">
                     <Stethoscope className="h-3 w-3"/>
                     {"الطبيب"}: {patient.last_visit_doctor_name}
                   </p>
                )}
              </div>
              <Button 
                 size="sm" 
                 variant="outline" 
                 className="text-xs h-7 px-2"
                 onClick={() => onSelectPatientVisit(patient.id, patient.last_visit_id, patient.last_visit_file_id)}
              >
                 <SaveAll className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5"/> {"اختيار"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
export default PatientSearchResultDisplay;