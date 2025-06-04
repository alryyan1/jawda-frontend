// src/components/clinic/dialogs/DoctorFinderDialog.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Vertical Tabs for side
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users2, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { DoctorShift } from '@/types/doctors';
import { getActiveDoctorShifts } from '@/services/clinicService';
import { useAuth } from '@/contexts/AuthContext';

interface DoctorFinderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  
  onDoctorShiftSelect: (shift: DoctorShift) => void; // Callback when a doctor's shift is selected
}

const DoctorFinderDialog: React.FC<DoctorFinderDialogProps> = ({
  isOpen, onOpenChange, onDoctorShiftSelect
}) => {
  const { t, i18n } = useTranslation(['clinic', 'common', 'doctors']);
  const { currentClinicShift } = useAuth();
  const isRTL = i18n.dir() === 'rtl';
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // NEW: State for DoctorFinderDialog visibility, now controlled by F9 too
  const [selectedSpecialistName, setSelectedSpecialistName] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'allShifts' | 'bySpecialist'>('allShifts');

  const { data: activeDoctorShifts = [], isLoading } = useQuery<DoctorShift[], Error>({
    queryKey: ['activeDoctorShiftsForFinderDialog', currentClinicShift?.id],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id),
    enabled: isOpen, // Only fetch when dialog is open
  });

  const uniqueSpecialistsOnDuty = useMemo(() => {
    if (!activeDoctorShifts) return [];
    const specialistMap = new Map<string, number>(); // name -> count
    activeDoctorShifts.forEach(shift => {
      const specName = shift.doctor_specialist_name || t('doctors:unknownSpecialist');
      specialistMap.set(specName, (specialistMap.get(specName) || 0) + 1);
    });
    return Array.from(specialistMap.entries()).map(([name, count]) => ({ name, count })).sort((a,b) => a.name.localeCompare(b.name));
  }, [activeDoctorShifts, t]);

  const filteredDoctorsBySpecialist = useMemo(() => {
    if (!selectedSpecialistName) return activeDoctorShifts; // Should not happen if bySpecialist tab active
    return activeDoctorShifts.filter(shift => 
      (shift.doctor_specialist_name || t('doctors:unknownSpecialist')) === selectedSpecialistName
    );
  }, [activeDoctorShifts, selectedSpecialistName, t]);
  
  // Reset specialist selection when main tab changes or dialog closes
  useEffect(() => {
    if (!isOpen || activeMainTab === 'allShifts') {
      setSelectedSpecialistName(null);
    }
    if (isOpen && activeMainTab === 'bySpecialist' && uniqueSpecialistsOnDuty.length > 0 && !selectedSpecialistName) {
        setSelectedSpecialistName(uniqueSpecialistsOnDuty[0].name); // Select first specialist by default
    }
  }, [isOpen, activeMainTab, uniqueSpecialistsOnDuty, selectedSpecialistName]);


  const handleDoctorSelectAndClose = (shift: DoctorShift) => {
    onDoctorShiftSelect(shift);
    onOpenChange(false);
  };

  const getInitials = (name?: string | null) => { /* ... (same getInitials function as in AppLayout) ... */ 
    if (!name?.trim()) return "Dr";
    const names = name.trim().split(" ");
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    if (names[0]) return names[0][0].toUpperCase();
    return "Dr";
  };


  const DoctorShiftCard: React.FC<{shift: DoctorShift}> = ({ shift }) => (
    <Card
        className="p-2 hover:bg-muted cursor-pointer transition-colors"
        onClick={() => handleDoctorSelectAndClose(shift)}
    >
        <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
            {shift.doctor_avatar_url && <AvatarImage src={shift.doctor_avatar_url} alt={shift.doctor_name} />}
            <AvatarFallback>{getInitials(shift.doctor_name)}</AvatarFallback>
        </Avatar>
        <div>
            <p className="text-sm font-medium leading-tight">{shift.doctor_name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{shift.doctor_specialist_name || t('doctors:noSpecialty')}</p>
        </div>
        </div>
    </Card>
  );
 // NEW: useEffect for F9 keyboard shortcut


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl lg:max-w-5xl max-h-[80vh] flex flex-col p-0 sm:p-0">
        <DialogHeader className="p-4 sm:p-6 border-b">
          <DialogTitle>{t('clinic:doctorFinder.title')}</DialogTitle>
          <DialogDescription>{t('clinic:doctorFinder.description')}</DialogDescription>
        </DialogHeader>

        <div className={cn("flex-grow flex overflow-hidden", isRTL ? "flex-row-reverse" : "flex-row")}>
          {/* Side Tabs for All Shifts / Specialists */}
          <div className={cn("w-48 p-3 border-slate-200 dark:border-slate-700 shrink-0 bg-muted/30", isRTL ? "border-l" : "border-r")}>
            <Tabs 
                orientation="vertical" 
                value={activeMainTab}
                onValueChange={(value) => setActiveMainTab(value as 'allShifts' | 'bySpecialist')}
                className="w-full"
            >
              <TabsList className="flex flex-col h-auto items-stretch w-full gap-1">
                <TabsTrigger value="allShifts" className="justify-start px-2 py-1.5 text-xs h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Users2 className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('clinic:doctorFinder.allActiveShiftsTab')}
                </TabsTrigger>
                <TabsTrigger value="bySpecialist" className="justify-start px-2 py-1.5 text-xs h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={uniqueSpecialistsOnDuty.length === 0}>
                    <Stethoscope className="h-4 w-4 ltr:mr-2 rtl:ml-2"/>{t('clinic:doctorFinder.bySpecialistTab')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content Area: Can show specialists list or doctors list */}
          <div className="flex-grow flex overflow-hidden">
            {activeMainTab === 'bySpecialist' && (
                <>
                <ScrollArea className={cn("w-56 p-2 shrink-0 border-slate-200 dark:border-slate-700", isRTL ? "border-l" : "border-r")}>
                    <div className="space-y-1">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4"/> :
                        uniqueSpecialistsOnDuty.map(spec => (
                        <Button
                            key={spec.name}
                            variant={selectedSpecialistName === spec.name ? "secondary" : "ghost"}
                            className="w-full justify-start text-xs h-auto px-2 py-1.5"
                            onClick={() => setSelectedSpecialistName(spec.name)}
                        >
                            {spec.name} ({spec.count})
                        </Button>
                        ))
                    }
                    { !isLoading && uniqueSpecialistsOnDuty.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center">{t('doctors:noSpecialistsOnDuty')}</p>}
                    </div>
                </ScrollArea>
                <ScrollArea className="flex-grow p-3">
                    <div ref={scrollViewportRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredDoctorsBySpecialist.map(shift => <DoctorShiftCard key={shift.id} shift={shift}/>)}
                        {!isLoading && selectedSpecialistName && filteredDoctorsBySpecialist.length === 0 && (
                             <p className="col-span-full text-center text-sm text-muted-foreground py-4">{t('doctors:noDoctorsForSpecialty')}</p>
                        )}
                    </div>
                </ScrollArea>
                </>
            )}

            {activeMainTab === 'allShifts' && (
                <ScrollArea className="flex-grow p-3">
                    <div ref={scrollViewportRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {isLoading ? <div className="col-span-full text-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div> :
                         activeDoctorShifts.map(shift => <DoctorShiftCard key={shift.id} shift={shift}/>)
                        }
                        {!isLoading && activeDoctorShifts.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-10">{t('clinic:doctorsTabs.noActiveShifts')}</p>}
                    </div>
                </ScrollArea>
            )}
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
            <DialogClose asChild><Button type="button" variant="outline">{t('common:close')}</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorFinderDialog;