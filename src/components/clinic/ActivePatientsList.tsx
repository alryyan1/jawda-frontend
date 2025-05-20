// src/components/clinic/ActivePatientsList.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { Patient } from '../../types/patiens'; // Main Patient type
import type { ActivePatientVisit } from '@/types/patiens'; // Or from patients.ts
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getActiveClinicPatients } from '@/services/clinicService'; // Updated service
import type { PaginatedResponse } from '@/services/doctorService';

interface ActivePatientsListProps {
  onPatientSelect: (patient: Patient, visitId: number) => void;
  selectedPatientVisitId: number | null;
  doctorShiftId: number | null; // ID of the selected DoctorShift
  // Or, if DoctorTabs directly gives doctor_id:
  // doctorId: number | null; 
  globalSearchTerm: string;
  currentClinicShiftId?: number | null; // Optional: overall clinic shift
}

const ActivePatientsList: React.FC<ActivePatientsListProps> = ({ 
  onPatientSelect, 
  selectedPatientVisitId, 
  doctorShiftId, 
  globalSearchTerm,
  currentClinicShiftId 
}) => {
  const { t } = useTranslation(['clinic', 'common']);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search term for API calls if performance becomes an issue
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(globalSearchTerm);
  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedSearchTerm(globalSearchTerm);
          setCurrentPage(1); // Reset to page 1 on new search
      }, 300); // 300ms delay
      return () => clearTimeout(handler);
  }, [globalSearchTerm]);


  const { 
    data: paginatedVisits, 
    isLoading, 
    isError, 
    error, 
    isFetching 
  } = useQuery<PaginatedResponse<ActivePatientVisit>, Error>({
    queryKey: ['activePatients', doctorShiftId, debouncedSearchTerm, currentClinicShiftId, currentPage],
    queryFn: () => getActiveClinicPatients({ 
        doctor_shift_id: doctorShiftId, // Or doctor_id if using that
        search: debouncedSearchTerm,
        clinic_shift_id: currentClinicShiftId,
        page: currentPage,
    }),
    placeholderData: keepPreviousData,
    // refetchInterval: 15000, // Optional: polling for updates
  });

  // Reset page to 1 if doctorShiftId changes
  useEffect(() => {
    setCurrentPage(1);
  }, [doctorShiftId]);

  if (isLoading && currentPage === 1 && !isFetching) { // Show main loader only on initial load of new filter/page
    return (
      <div className="flex justify-center items-center h-40 pt-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-destructive p-4">{t('common:error.fetchFailed', { entity: t('clinic:workspace.title'), message: error.message })}</p>;
  }

  const visits = paginatedVisits?.data || [];
  const meta = paginatedVisits?.meta;

  return (
    <div className="h-full flex flex-col">
        {isFetching && <div className="text-xs text-muted-foreground p-1 text-center"><Loader2 className="inline h-3 w-3 animate-spin ltr:mr-1 rtl:ml-1" />{t('common:updatingList')}</div>}
        {visits.length === 0 && !isLoading && !isFetching ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground p-6 border rounded-lg bg-card">
                 <Users className="h-16 w-16 text-muted-foreground/30 mb-4" /> {/* Using Users icon */}
                <p>{t('clinic:workspace.noActivePatients')}</p>
                <p className="text-xs mt-1">{t('clinic:workspace.tryDifferentFilters')}</p>
            </div>
        ) : (
            <ScrollArea className="flex-grow">
                <div className="space-y-2 pr-1"> {/* Added pr-1 for scrollbar space */}
                    {visits.map((visit) => (
                    <Card 
                        key={visit.id} 
                        className={cn(
                            "hover:shadow-lg transition-shadow cursor-pointer",
                            selectedPatientVisitId === visit.id ? "ring-2 ring-primary shadow-lg" : "ring-1 ring-transparent"
                        )}
                        onClick={() => onPatientSelect(visit.patient, visit.id)}
                    >
                        <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="text-base flex justify-between items-center">
                            <span className="truncate" title={visit.patient.name}>{visit.patient.name}</span>
                            <Badge 
                                variant={visit.status === 'waiting' ? 'outline' 
                                        : visit.status === 'with_doctor' ? 'default' 
                                        : 'secondary'}
                                className={visit.status === 'with_doctor' ? 'bg-blue-500 text-white' : ''}
                            >
                                {t(`clinic:workspace.status.${visit.status}`, visit.status)}
                            </Badge>
                        </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-0.5 px-3 pb-2">
                        <p><strong>{t('common:id')}:</strong> {visit.patient.id} | <strong>{t('common:phoneShort')}:</strong> {visit.patient.phone}</p>
                        <p>
                            <strong>{t('common:doctor')}:</strong> {visit.doctor?.name || t('common:unassigned')}
                        </p>
                        {/* Add more details like queue number or appointment time */}
                        </CardContent>
                    </Card>
                    ))}
                </div>
            </ScrollArea>
        )}

        {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t shrink-0">
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!meta.links?.prev || isFetching} size="sm" variant="outline">
                {t('common:pagination.previous')}
            </Button>
            <span className="text-xs text-muted-foreground">
                {t('common:pagination.pageInfo', { current: meta.current_page, total: meta.last_page })}
            </span>
            <Button onClick={() => setCurrentPage(p => Math.min(meta.last_page, p + 1))} disabled={!meta.links?.next || isFetching} size="sm" variant="outline">
                {t('common:pagination.next')}
            </Button>
            </div>
        )}
    </div>
  );
};

export default ActivePatientsList;