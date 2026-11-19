// src/components/doctor-portal/DoctorPortalDatePicker.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { getDoctorPatientCountsByDay } from '@/services/clinicService';

interface DoctorPortalDatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

// Sits in the header next to the admitted-patients button — a calendar
// popover whose days are badged with this doctor's patient count that day.
const DoctorPortalDatePicker: React.FC<DoctorPortalDatePickerProps> = ({ selectedDate, onDateChange }) => {
  const { user } = useAuth();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => dayjs(selectedDate).startOf('month').toDate());

  useEffect(() => {
    if (calendarOpen) {
      setVisibleMonth(dayjs(selectedDate).startOf('month').toDate());
    }
  }, [calendarOpen, selectedDate]);

  const monthStart = dayjs(visibleMonth).startOf('month').format('YYYY-MM-DD');
  const monthEnd = dayjs(visibleMonth).endOf('month').format('YYYY-MM-DD');

  const { data: countsByDay = {} } = useQuery({
    queryKey: ['doctorPortal', 'patientCountsByDay', user?.doctor_id, monthStart, monthEnd],
    queryFn: () => getDoctorPatientCountsByDay(user!.doctor_id!, monthStart, monthEnd),
    enabled: calendarOpen && !!user?.doctor_id,
  });

  return (
    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1.5 px-2.5 text-xs font-normal text-muted-foreground"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {dayjs(selectedDate).format('DD/MM/YYYY')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={dayjs(selectedDate).toDate()}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          onSelect={date => {
            if (!date) {
              return;
            }
            onDateChange(dayjs(date).format('YYYY-MM-DD'));
            setCalendarOpen(false);
          }}
          components={{
            DayContent: ({ date }) => {
              const count = countsByDay[dayjs(date).format('YYYY-MM-DD')];
              return (
                <div className="relative flex h-full w-full items-center justify-center">
                  <span>{date.getDate()}</span>
                  {!!count && (
                    <span className="absolute -bottom-1 -end-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[0.55rem] font-semibold leading-none text-primary-foreground">
                      {count}
                    </span>
                  )}
                </div>
              );
            },
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DoctorPortalDatePicker;
