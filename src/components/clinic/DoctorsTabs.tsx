// src/components/clinic/DoctorsTabs.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import type { DoctorShift } from '@/types/doctors';
import { getActiveDoctorShifts } from '@/services/clinicService';
import { Tooltip, TooltipContent, TooltipTrigger } from '@radix-ui/react-tooltip';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorization } from '@/hooks/useAuthorization';

interface DoctorsTabsProps {
  onShiftSelect: (shift: DoctorShift | null) => void;
  activeShiftId: number | null;
  setSelectedPatientVisit: (visit: Visit | null) => void;
}

const DoctorsTabs: React.FC<DoctorsTabsProps> = ({ onShiftSelect, activeShiftId,setSelectedPatientVisit }) => {
  const { t, i18n } = useTranslation(['clinic', 'common']);
  const isRTL = i18n.dir() === 'rtl';
  const {can} = useAuthorization()
  const {user} = useAuth()
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const {currentClinicShift,isLoadingShift,refetchCurrentClinicShift} = useAuth()
  const { data: doctorShifts, isLoading, error } = useQuery<DoctorShift[], Error>({
    queryKey: ['activeDoctorShifts', currentClinicShift?.id],
    queryFn: () => getActiveDoctorShifts(currentClinicShift?.id || undefined),
    refetchInterval: 30000,
  });
  console.log(can('list all_doctor_shifts'),'can list all doctor shifts',user,'user')
  //filter doctorShifts to show only the shifts that the user has access to
   let filteredDoctorShifts: DoctorShift[]|undefined   = [];
   if(can('list all_doctor_shifts')){
    filteredDoctorShifts = doctorShifts
   }else{
    filteredDoctorShifts = doctorShifts?.filter((ds)=>{
   
  
    return ds.user_id === user?.id 
    })
   }
  const checkScrollability = () => {
    if (scrollViewportRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollViewportRef.current;
      setCanScrollLeft(isRTL ? scrollLeft < scrollWidth - clientWidth : scrollLeft > 0);
      setCanScrollRight(isRTL ? scrollLeft > 0 : scrollLeft < scrollWidth - clientWidth);
    }
  };

  // Check scrollability on mount and when content changes
  useEffect(() => {
    checkScrollability();
    // Add resize observer to check scrollability when container size changes
    const resizeObserver = new ResizeObserver(checkScrollability);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [doctorShifts]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollViewportRef.current) {
    // alert('scroll')
      const scrollAmount = 200;
      scrollViewportRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
 console.log("doctorShifts",doctorShifts)
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

  const getInitials = (name?: string | null) => {
    if (!name) return "DR";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    if (names[0]) {
      return names[0][0].toUpperCase();
    }
    return 'DR';
  };

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
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col border rounded-lg bg-background shadow-sm overflow-hidden">
        {/* <h3 className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2 tracking-wider shrink-0 border-b">
          {t('clinic:topNav.activeDoctors')}
        </h3> */}

        <div className="relative flex-grow flex items-center">
          
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card/80 hover:bg-card shadow-md",
                isRTL ? "right-1" : "left-1"
              )}
              onClick={() => handleScroll(isRTL ? 'right' : 'left')}
              aria-label={isRTL ? t('common:next') : t('common:previous')}
            >
              {isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          

          <ScrollArea className="w-full h-full px-1">
            <ScrollAreaPrimitive.Viewport
              ref={scrollViewportRef}
              className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
              onScroll={checkScrollability}
            >
              <div 
                ref={contentRef} 
                className="flex space-x-2 rtl:space-x-reverse py-2 px-2 items-stretch gap-2"
              >
                {/* <Button
                  variant={activeShiftId === null ? "secondary" : "outline"}
                  className="h-auto py-1.5 px-3 flex flex-col items-center justify-center  whitespace-nowrap min-w-[150px] sm:min-w-[80px] shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary shrink-0"
                  onClick={() => onShiftSelect(null)}
                  data-state={activeShiftId === null ? "active" : "inactive"}
                >
                  <Users className="h-4 w-4 mb-0.5"/>
                  <span className="text-[11px] sm:text-xs font-medium">{t('common:all')}</span>
                </Button> */}

                {filteredDoctorShifts?.map((shift) => (
                  <Tooltip key={shift.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeShiftId === shift.id ? "secondary" : "outline"}
                        className={cn(
                          "h-auto py-1.5 cursor-pointer px-3 flex flex-col  items-center justify-center relative whitespace-nowrap min-w-[90px] sm:min-w-[100px] shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary shrink-0",
                          shift.is_examining ? "border-blue-500 dark:border-blue-400 focus-visible:ring-blue-500" 
                                             : "border-green-500 dark:border-green-400 focus-visible:ring-green-500",
                          activeShiftId === shift.id && (shift.is_examining ? "bg-blue-500/10 dark:bg-blue-500/20 " : "bg-green-500/10 dark:bg-green-500/20 w-[200px]")
                        )}
                        onClick={() => onShiftSelect(shift)}
                        data-state={activeShiftId === shift.id ? "active" : "inactive"}
                      >
                        <div className="flex items-center mb-0.5">
                       
                          <span className="text-xs font-medium " title={shift.doctor_name}>
                            {shift.doctor_name}
                          </span>
                          {console.log(shift.doctor_name,'shift.doctor_name')}
                        </div>
                        <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                          {shift.patients_count > 0 && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[9px] h-4 leading-tight ">
                              {shift.patients_count}
                            </Badge>
                          )}
                          {/* <Badge 
                            variant="outline" 
                            className={cn("px-1.5 py-0 text-[9px] h-4 leading-tight",
                              shift.is_examining ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10" 
                                                 : "border-green-500 text-green-600 dark:text-green-400 bg-green-500/10"
                            )}
                          >
                            {shift.is_examining ? t('clinic:doctorsTabs.examining') : t('clinic:doctorsTabs.free')}
                          </Badge> */}
                        </div>
                      </Button>
                    </TooltipTrigger>
                    {shift.doctor_specialist_name && (
                      <TooltipContent>
                        <p>{t('doctors:table.specialist')}: {shift.doctor_specialist_name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar orientation="horizontal" className="h-2" />
          </ScrollArea>

        
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card/80 hover:bg-card shadow-md",
                isRTL ? "left-1" : "right-1"
              )}
              onClick={() => handleScroll(isRTL ? 'left' : 'right')}
              aria-label={isRTL ? t('common:previous') : t('common:next')}
            >
              {isRTL ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
          
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DoctorsTabs;