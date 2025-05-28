// src/components/ui/datetime-picker.tsx
"use client"; // If using Next.js App Router

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { arSA, enUS } from 'date-fns/locale'; // For localized date formatting
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface DateTimePickerProps {
  date: Date | undefined; // The selected DateTime value
  onDateChange: (date: Date | undefined) => void; // Callback when DateTime changes
  placeholder?: string;
  disabled?: boolean;
  // You can add more props from CalendarProps if needed, like disabledDates, etc.
  calendarProps?: Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect' | 'initialFocus'>;
  showTimezone?: boolean; // Optional: to display client timezone
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  date,
  onDateChange,
  placeholder,
  disabled,
  calendarProps,
  showTimezone = false,
}) => {
  const { t, i18n } = useTranslation(['common']);
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Internal state for time parts to allow separate input
  const [hours, setHours] = useState<string>(date ? format(date, 'HH') : '00');
  const [minutes, setMinutes] = useState<string>(date ? format(date, 'mm') : '00');
  
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  // Sync internal time state when the date prop changes externally
  useEffect(() => {
    if (date) {
      setHours(format(date, 'HH'));
      setMinutes(format(date, 'mm'));
    }
  }, [date]);

  const handleDateSelect = (selectedDay: Date | undefined) => {
    if (!selectedDay) {
      onDateChange(undefined);
      return;
    }

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    
    const newDate = new Date(selectedDay);
    newDate.setHours(h);
    newDate.setMinutes(m);
    newDate.setSeconds(0);

    onDateChange(newDate);
  };

  const handleTimeChange = () => {
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59 && date) {
      const newDate = new Date(date);
      newDate.setHours(h);
      newDate.setMinutes(m);
      newDate.setSeconds(0);
      onDateChange(newDate);
    }
  };
  
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 23))) {
      setHours(val);
       if (val.length === 2 && minuteInputRef.current) {
        minuteInputRef.current.focus();
        minuteInputRef.current.select();
      }
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
     if (/^\d*$/.test(val) && (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 59))) {
      setMinutes(val);
    }
  };

  const handleTimeInputBlur = () => {
    const formattedHours = hours.padStart(2, '0');
    const formattedMinutes = minutes.padStart(2, '0');
    if (hours !== formattedHours) setHours(formattedHours);
    if (minutes !== formattedMinutes) setMinutes(formattedMinutes);
    handleTimeChange();
  };

  const displayFormat = i18n.language.startsWith('ar') ? "Pp" : "PPPp"; // P for date, p for time, PPP for long date

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full sm:w-[280px] justify-start text-left font-normal h-9 px-3", // Standard input height
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {date ? format(date, displayFormat, { locale: dateLocale }) : <span>{placeholder || t('datePicker.pickDateTime', "Pick a date & time")}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus={!date} // Focus calendar if no date selected
          disabled={disabled}
          locale={dateLocale}
          dir={i18n.dir()}
          {...calendarProps}
        />
        <Separator />
        <div className="p-3 border-t border-border">
          <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground"/> 
            {t('datePicker.timeTitle', "Time")}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="grid gap-1 text-center">
              <Label htmlFor="hours" className="text-xs">{t('datePicker.hours', "HH")}</Label>
              <Input
                id="hours"
                ref={hourInputRef}
                type="text" // Use text to allow leading zeros and better control
                inputMode="numeric"
                value={hours}
                onChange={handleHourChange}
                onBlur={handleTimeInputBlur}
                className="w-[48px] h-8 text-center text-sm"
                maxLength={2}
                disabled={disabled}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <span className="font-semibold pt-4">:</span>
            <div className="grid gap-1 text-center">
              <Label htmlFor="minutes" className="text-xs">{t('datePicker.minutes', "MM")}</Label>
              <Input
                id="minutes"
                ref={minuteInputRef}
                type="text"
                inputMode="numeric"
                value={minutes}
                onChange={handleMinuteChange}
                onBlur={handleTimeInputBlur}
                className="w-[48px] h-8 text-center text-sm"
                maxLength={2}
                disabled={disabled}
                onFocus={(e) => e.target.select()}
              />
            </div>
            {/* Optionally add AM/PM toggle if not using 24-hour format */}
          </div>
          {showTimezone && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
                {t('datePicker.timezoneNote', {timezone: Intl.DateTimeFormat().resolvedOptions().timeZone})}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};