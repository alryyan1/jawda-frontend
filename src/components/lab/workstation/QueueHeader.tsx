// src/components/lab/workstation/QueueHeader.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users, RotateCcw, CalendarDays } from 'lucide-react'; // Keep CalendarDays for shift date display
import type { Shift } from '@/types/shifts';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
// Remove DatePickerWithRange and DateRange imports

interface QueueHeaderProps {
  currentShift: Shift | null;
  patientCount: number;
  onShiftChange: (direction: 'next' | 'prev') => void; // Now mandatory
  onRefreshQueue: () => void;
  isLoading: boolean;
}

const QueueHeader: React.FC<QueueHeaderProps> = ({
  currentShift, patientCount, onShiftChange, onRefreshQueue, isLoading
}) => {
  const { t, i18n } = useTranslation(['labResults', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const displayShiftInfo = () => {
    if (!currentShift) {
      return t('labResults:queueHeader.noShiftActive');
    }
    const shiftLabel = currentShift.name || `${t('common:shift')} #${currentShift.id}`;
    const shiftDate = currentShift.created_at
      ? format(parseISO(currentShift.created_at), 'PPP', { locale: dateLocale })
      : t('common:dateUnknown');
    return `${shiftLabel} (${shiftDate})`;
  };

  const PrevIcon = i18n.dir() === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="p-2 sm:p-3 border-b bg-card sticky top-0 z-10">
      <div className="flex justify-between items-center mb-1.5">
        <div className="min-w-0"> {/* For truncation */}
          <h3 className="text-xs sm:text-sm font-semibold leading-tight truncate" title={displayShiftInfo()}>
            {displayShiftInfo()}
          </h3>
          {currentShift?.created_at && (
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              {t('common:openedAt')}: {format(parseISO(currentShift.created_at), 'p', { locale: dateLocale })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onShiftChange('prev')} title={t('labResults:queueHeader.prevShift')} disabled={isLoading /* Add logic to disable if no prev shift */}>
            <PrevIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onShiftChange('next')} title={t('labResults:queueHeader.nextShift')} disabled={isLoading /* Add logic to disable if no next shift */}>
            <NextIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={onRefreshQueue} title={t('common:refreshList')} disabled={isLoading}>
            <RotateCcw className={`h-4 w-4 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center text-[10px] sm:text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {currentShift?.created_at ? format(parseISO(currentShift.created_at), 'PPP', { locale: dateLocale }) : t('common:dateUnknown')}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {t('labResults:queueHeader.patientsInQueue', { count: patientCount })}
        </span>
      </div>
    </div>
  );
};
export default QueueHeader;