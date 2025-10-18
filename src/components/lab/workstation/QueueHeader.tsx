// src/components/lab/workstation/QueueHeader.tsx
import React from 'react';
import { IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight, Users, RotateCcw, CalendarDays, Loader2 } from 'lucide-react'; // Keep CalendarDays for shift date display
import type { Shift } from '@/types/shifts';
import dayjs from 'dayjs';
import showJsonDialog from '@/lib/showJsonDialog';
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

  const displayShiftInfo = () => {
    if (!currentShift) {
      return 'لا توجد وردية نشطه';
    }
    // showJsonDialog(currentShift);
    let shiftAmOrPm = currentShift.created_at ? dayjs(currentShift.created_at).format('A') : 'تاريخ غير معروف';
    // alert(shiftAmOrPm);
    // const shiftLabel = currentShift.name || `الوردية #${currentShift.id}`;

    return `${shiftAmOrPm === 'AM' ? 'الورديه الصباحيه' : 'الورديه المسائيه'} `;
  };
// showJsonDialog
  // const RefreshIcon = RotateCcw;
  // Arabic UI is RTL: previous → right, next → left
  const PrevIcon = ChevronRight;
  const NextIcon = ChevronLeft;
 console.log(currentShift,'currentShift');
  return (
    <div className="p-2 sm:p-3 border-b bg-card sticky top-0 z-10">
      <div className="flex justify-between items-center mb-1.5">
        <div className="min-w-0"> {/* For truncation */}
          <h3 className="text-xs sm:text-sm font-semibold leading-tight truncate" title={displayShiftInfo()}>
            {displayShiftInfo()}
          </h3>
          {currentShift?.created_at && (
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              {'فُتِحت عند'}: {dayjs(currentShift.created_at).format('hh:mm A')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <IconButton 
            size="small" 
            className="h-7 w-7 sm:h-8 sm:w-8" 
            onClick={() => onShiftChange('prev')} 
            // title={'الوردية '} 
            disabled={isLoading || currentShift?.is_last_shift}
            sx={{ 
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              }
            }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <PrevIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
          </IconButton>
          <IconButton 
            size="small" 
            className="h-7 w-7 sm:h-8 sm:w-8" 
            onClick={() => onShiftChange('next')} 
            // title={'الوردية التالية'} 
            disabled={isLoading }
            sx={{ 
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              }
            }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <NextIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
          </IconButton>
          <IconButton 
            size="small" 
            className="h-7 w-7 sm:h-8 sm:w-8" 
            onClick={onRefreshQueue} 
            title={'تحديث القائمة'} 
            disabled={isLoading}
            sx={{ 
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              }
            }}
          >
            <RotateCcw className={`h-4 w-4 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </IconButton>
        </div>
      </div>
      <div className="flex justify-between items-center text-[10px] sm:text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {currentShift?.created_at ? dayjs(currentShift.created_at).format('DD/MM/YYYY') : 'تاريخ غير معروف'}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          {`المرضى : ${patientCount}`}
        </span>
      </div>
    </div>
  );
};
export default QueueHeader;