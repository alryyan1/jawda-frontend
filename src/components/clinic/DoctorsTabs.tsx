// src/components/clinic/DoctorsTabs.tsx
import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserMd } from 'lucide-react'; // Assuming UserMd is a doctor icon from your icon set
import type { DoctorShift } from '@/types/doctors'; // Your type
import { getActiveDoctorShifts } from '@/services/clinicService'; // Updated service

interface DoctorsTabsProps {
  onShiftSelect: (shift: DoctorShift | null) => void;
  activeShiftId: number | null;
  currentClinicShiftId?: number | null; // Optional: if you have a general clinic shift context
}

const DoctorsTabs: React.FC<DoctorsTabsProps> = ({ onShiftSelect, activeShiftId, currentClinicShiftId }) => {
  const { t, i18n } = useTranslation(['clinic', 'common']);
  
  const { data: doctorShifts, isLoading, error } = useQuery<DoctorShift[], Error>({
    queryKey: ['activeDoctorShifts', currentClinicShiftId], // Include clinicShiftId if it affects the query
    queryFn: () => getActiveDoctorShifts(currentClinicShiftId || undefined),
  });

  // Select the first doctor by default if no activeShiftId is provided and shifts are loaded
  useEffect(() => {
    if (!activeShiftId && doctorShifts && doctorShifts.length > 0) {
      onShiftSelect(doctorShifts[0]);
    }
  }, [activeShiftId, doctorShifts, onShiftSelect]);


  if (isLoading) return (
    <div className="flex items-center justify-center h-full border rounded-md p-2 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
  if (error) return <div className="text-xs text-destructive p-2 border rounded-md bg-background">{t('common:error.fetchFailed', { entity: t('clinic:topNav.activeDoctors')})}</div>;
  if (!doctorShifts || doctorShifts.length === 0) {
    return (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground border rounded-md p-2 bg-background">
            {t('clinic:doctorsTabs.noActiveShifts')}
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col border rounded-lg p-2 bg-background shadow-sm">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase px-1 pb-1 tracking-wider shrink-0">
        {t('clinic:topNav.activeDoctors')}
      </h3>
      <ScrollArea className="flex-grow w-full -mx-1"> {/* Negative margin to counteract TabsList padding */}
        <Tabs
          value={activeShiftId ? String(activeShiftId) : undefined}
          onValueChange={(value) => {
            const selected = doctorShifts.find(ds => String(ds.id) === value);
            onShiftSelect(selected || null);
          }}
          className="w-full pt-1"
          dir={i18n.dir()}
        >
          <TabsList className="flex flex-nowrap overflow-x-auto w-full justify-start p-1 h-auto bg-transparent">
            {/* "All" Tab - optional */}
            <TabsTrigger 
                value="all" // A special value
                onClick={() => onShiftSelect(null)} // Signal to show all patients
                className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 h-auto data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
            >
                {t('common:all', 'All')}
            </TabsTrigger>
            {doctorShifts.map((shift) => (
              <TabsTrigger
                key={shift.id}
                value={String(shift.id)}
                className="text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 h-auto data-[state=active]:shadow-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
              >
                {/* <UserMd className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" /> */}
                {shift.doctor_name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </ScrollArea>
    </div>
  );
};
export default DoctorsTabs;