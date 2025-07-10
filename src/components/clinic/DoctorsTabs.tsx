// src/components/clinic/DoctorsTabs.tsx
import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { Badge } from '../ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';
import type { DoctorShift } from '@/types/doctors';
import type { Patient } from '@/types/patients';
import { getActiveDoctorShifts } from '@/services/clinicService';

interface DoctorsTabsProps {
  onShiftSelect: (shift: DoctorShift | null) => void;
  activeShiftId: number | null;
  setSelectedPatientVisit: (visit: { patient: Patient; visitId: number } | null) => void;
}

const DoctorsTabs: React.FC<DoctorsTabsProps> = ({ onShiftSelect, activeShiftId }) => {
  const { t } = useTranslation(['clinic', 'common']);
  const { can } = useAuthorization();
  const { user } = useAuth();
  const { currentClinicShift } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: doctorShifts, isLoading, error } = useQuery<DoctorShift[], Error>({
    queryKey: ['activeDoctorShifts', currentClinicShift?.id],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id || undefined),
    refetchInterval: 30000,
  });

  // Filter doctor shifts to show only the shifts that the user has access to
  let filteredDoctorShifts: DoctorShift[] | undefined = [];
  if (can('list all_doctor_shifts')) {
    filteredDoctorShifts = doctorShifts;
  } else {
    filteredDoctorShifts = doctorShifts?.filter((ds) => ds.user_id === user?.id);
  }

  

  useEffect(() => {
    if (!activeShiftId && filteredDoctorShifts && filteredDoctorShifts.length > 0) {
      onShiftSelect(filteredDoctorShifts[0]);
    } else if (activeShiftId && filteredDoctorShifts) {
      const currentActive = filteredDoctorShifts.find(ds => ds.id === activeShiftId);
      if (!currentActive && filteredDoctorShifts.length > 0) {
        onShiftSelect(filteredDoctorShifts[0]);
      } else if (!currentActive && filteredDoctorShifts.length === 0) {
        onShiftSelect(null);
      }
    }
  }, [activeShiftId, filteredDoctorShifts, onShiftSelect]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full border rounded-lg p-4 bg-card">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="ml-2 text-sm text-muted-foreground">{t('common:loading')}</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full text-sm text-destructive p-4 border rounded-lg bg-card">
      <div className="text-center">
        <p className="font-medium">{t('common:error.fetchFailed', { entity: t('clinic:topNav.activeDoctors') })}</p>
        <p className="text-xs mt-1 text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );

  if (!doctorShifts || doctorShifts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground border rounded-lg p-4 bg-card">
        <div className="text-center">
          <p className="font-medium">{t('clinic:doctorsTabs.noActiveShifts')}</p>
          <p className="text-xs mt-1">{t('clinic:doctorsTabs.noActiveShiftsDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-card border rounded-lg shadow-sm overflow-hidden">
            {/* Professional Tab Container */}
      <div className="relative flex items-center h-full">
        {/* Scrollable Tabs Container */}
         <div
           ref={scrollContainerRef}
           className="flex-1 custom-scrollbar"
           style={{
             overflowX: 'auto',
             overflowY: 'hidden',
             paddingLeft: '8px',
             paddingRight: '8px',
             paddingBottom: '8px', // Space for scrollbar
             minWidth: 0, // Important for flex children
           }}
         >
           <div className="flex gap-1 py-2" style={{ minWidth: 'max-content' }}>
            {filteredDoctorShifts?.map((shift) => {
              const isActive = activeShiftId === shift.id;
              const isExamining = shift.is_examining;
              
              return (
                <button
                  key={shift.id}
                  onClick={() => onShiftSelect(shift)}
                  className={`
                    group relative flex flex-col items-center justify-center
                    min-w-[200px] max-w-[200px] h-16 px-4 py-2
                    rounded-lg border-2 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary/50
                    ${isActive
                      ? isExamining
                        ? 'bg-blue-500 border-blue-600 text-white shadow-lg'
                        : 'bg-emerald-500 border-emerald-600 text-white shadow-lg'
                      : isExamining
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:hover:bg-blue-900 dark:text-blue-100'
                        : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:hover:bg-emerald-900 dark:text-emerald-100'
                    }
                  `}
                >
                  {/* Doctor Name */}
                  <div className="flex items-center mb-1">
                    <span 
                      className={`text-sm font-semibold truncate max-w-full ${
                        isActive ? 'text-white' : ''
                      }`}
                      title={shift.doctor_name}
                    >
                      {shift.doctor_name}
                    </span>
                  </div>

                  {/* Status Indicators */}
                  <div className="flex items-center gap-2">
                    {/* Patient Count Badge */}
                    {shift.patients_count > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={`
                          px-2 py-0.5 text-xs font-medium h-5
                          ${isActive 
                            ? 'bg-white/20 text-white border-white/30' 
                            : isExamining
                              ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-100'
                          }
                        `}
                      >
                        {shift.patients_count} 
                      </Badge>
                    )}

                 
                  </div>

                  {/* Active Tab Indicator */}
                  {isActive && (
                    <div className={`
                      absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2
                      w-3 h-3 rotate-45
                      ${isExamining ? 'bg-blue-500' : 'bg-emerald-500'}
                    `} />
                  )}
                </button>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
};

export default DoctorsTabs;