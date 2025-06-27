// src/components/lab/reception/LabPatientSearchResultDisplay.tsx (New File)
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

// MUI Imports
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

// Shadcn & Custom
import { PatientSearchResult } from '@/types/patients';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Phone, Calendar, Stethoscope, UserPlus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { getDoctorsList } from '@/services/doctorService';
import { DoctorStripped } from '@/types/doctors';

interface LabPatientSearchResultDisplayProps {
  results: PatientSearchResult[];
  onSelectPatient: (patientId: number, doctorId: number) => void;
  isLoading: boolean;
}

const LabPatientSearchResultDisplay: React.FC<LabPatientSearchResultDisplayProps> = ({ results, onSelectPatient, isLoading }) => {
  const { t, i18n } = useTranslation(['labReception', 'common', 'patients']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  // Each result card will manage its own selected doctor state
  const [selectedDoctors, setSelectedDoctors] = useState<Record<number, DoctorStripped | null>>({});

  const { data: doctorsList = [], isLoading: isLoadingDoctors } = useQuery<DoctorStripped[], Error>({
    queryKey: ['doctorsListForLabSearchResult'],
    queryFn: () => getDoctorsList({ active: true }),
  });

  const handleDoctorChange = (patientId: number, doctor: DoctorStripped | null) => {
    setSelectedDoctors(prev => ({ ...prev, [patientId]: doctor }));
  };

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">{t('common:searching')}</div>;
  }
  if (results.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">{t('common:noResultsFound')}</div>;
  }

  return (
    <ScrollArea className="max-h-[400px] shadow-xl">
      <div className="space-y-2 p-1">
        {results.map(patient => (
          <Card key={patient.id} className="p-2 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="space-y-1 flex-grow">
                <p className="text-sm font-semibold flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary"/>{patient.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3"/>{patient.phone || '-'}</p>
                {patient.last_visit_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3 w-3"/>
                    {t('patients:search.lastVisit')}: {format(parseISO(patient.last_visit_date), 'P', {locale: dateLocale})}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                 <Autocomplete
                    options={doctorsList}
                    loading={isLoadingDoctors}
                    getOptionLabel={(option) => option.name}
                    value={selectedDoctors[patient.id] || null}
                    onChange={(_, newValue) => handleDoctorChange(patient.id, newValue)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    size="small"
                    sx={{ width: {xs: '100%', sm: 180}}}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('patients:search.selectDoctor')}
                        variant="outlined"
                        InputProps={{ ...params.InputProps, endAdornment: (<>{isLoadingDoctors ? <CircularProgress size={16}/> : null}{params.InputProps.endAdornment}</>) }}
                      />
                    )}
                    PaperComponent={(props) => <Paper {...props} className="dark:bg-slate-800 dark:text-slate-100" />}
                 />
                 <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9"
                    onClick={() => {
                        if(selectedDoctors[patient.id]?.id) {
                            onSelectPatient(patient.id, selectedDoctors[patient.id]!.id);
                        } else {
                            toast.error(t('labReception:validation.selectDoctorForExisting'));
                        }
                    }}
                    disabled={!selectedDoctors[patient.id]}
                 >
                    <UserPlus className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5"/> {t('labReception:createNewLabVisit')}
                 </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
export default LabPatientSearchResultDisplay;