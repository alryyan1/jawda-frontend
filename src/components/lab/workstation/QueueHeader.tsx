// src/components/lab/workstation/QueueHeader.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarDays, Users, RotateCcw } from 'lucide-react'; // Added RotateCcw for refresh
import { Shift } from '@/types/shifts';
import { format, parseISO } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Assuming you create/use this
import { DateRange } from 'react-day-picker';

interface QueueHeaderProps {
  currentShift: Shift | null;
  patientCount: number;
  onShiftChange?: (direction: 'next' | 'prev') => void; // Optional if not implemented yet
  currentDateRange: DateRange | undefined; // For DateRangePicker
  onDateRangeChange: (dateRange: DateRange | undefined) => void;
  onRefreshQueue: () => void;
  isLoading: boolean;
}

const QueueHeader: React.FC<QueueHeaderProps> = ({ 
    currentShift, patientCount, onShiftChange, currentDateRange, onDateRangeChange, onRefreshQueue, isLoading 
}) => {
  const { t, i18n } = useTranslation(['labResults', 'common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  const displayDate = () => {
    if (currentDateRange?.from && currentDateRange?.to) {
        if (format(currentDateRange.from, 'yyyy-MM-dd') === format(currentDateRange.to, 'yyyy-MM-dd')) {
            return format(currentDateRange.from, 'PPP', { locale: dateLocale });
        }
        return `${format(currentDateRange.from, 'P', { locale: dateLocale })} - ${format(currentDateRange.to, 'P', { locale: dateLocale })}`;
    }
    if (currentDateRange?.from) {
        return format(currentDateRange.from, 'PPP', { locale: dateLocale });
    }
    if (currentShift?.created_at) { // Fallback to shift creation date if no date range
        return format(parseISO(currentShift.created_at), 'PPP', { locale: dateLocale });
    }
    return t('common:today');
  };

  return (
    <div className="p-3 border-b bg-card sticky top-0 z-10">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-sm font-semibold leading-tight">
            {currentShift ? (currentShift.name || `${t('common:shift')} #${currentShift.id}`) : t('labResults:queueHeader.noShift')}
          </h3>
          {currentShift?.created_at && (
            <p className="text-xs text-muted-foreground leading-tight">
                {t('common:openedAt')}: {format(parseISO(currentShift.created_at), 'p', { locale: dateLocale })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Date Range Picker */}
          <DatePickerWithRange 
            date={currentDateRange} 
            onDateChange={onDateRangeChange} 
            align={i18n.dir() === 'rtl' ? "end" : "start"}
            buttonSize="xs" // Custom prop for smaller button
            buttonVariant="ghost"
            disabled={isLoading}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefreshQueue} title={t('common:refreshList')} disabled={isLoading}>
            <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}/>
          </Button>
          {/* Shift navigation placeholder */}
          {/* {onShiftChange && (
            <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onShiftChange('prev')} title={t('labResults:queueHeader.prevShift')}>
              {i18n.dir() === 'rtl' ? <ChevronRight className="h-4 w-4"/> : <ChevronLeft className="h-4 w-4"/>}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onShiftChange('next')} title={t('labResults:queueHeader.nextShift')}>
              {i18n.dir() === 'rtl' ? <ChevronLeft className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
            </Button>
            </>
          )} */}
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5"/> 
            {displayDate()}
        </span>
        <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5"/>
            {t('labResults:queueHeader.patientsInQueue', { count: patientCount })}
        </span>
      </div>
    </div>
  );
};
export default QueueHeader;