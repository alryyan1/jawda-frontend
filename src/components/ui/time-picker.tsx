// src/components/ui/time-picker.tsx
import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled, id }) => {
  const [hours, minutes] = value?.split(':') || ['08', '00'];

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHours = e.target.value;
    if (newHours === '' || (parseInt(newHours) >= 0 && parseInt(newHours) <= 23)) {
        if (newHours.length === 1) newHours = '0' + newHours;
        if (newHours.length > 2) newHours = newHours.slice(0,2);
        onChange(`${newHours}:${minutes}`);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinutes = e.target.value;
    if (newMinutes === '' || (parseInt(newMinutes) >= 0 && parseInt(newMinutes) <= 59)) {
        if (newMinutes.length === 1) newMinutes = '0' + newMinutes;
        if (newMinutes.length > 2) newMinutes = newMinutes.slice(0,2);
        onChange(`${hours}:${newMinutes}`);
    }
  };
  
  const handleBlur = (part: 'hours' | 'minutes', currentValue: string, maxLength: number, maxVal: number) => {
    let finalValue = currentValue;
    if(finalValue === '') finalValue = '00';
    else if(parseInt(finalValue) > maxVal) finalValue = String(maxVal);
    finalValue = finalValue.padStart(maxLength, '0');
    
    if (part === 'hours') onChange(`${finalValue}:${minutes}`);
    else onChange(`${hours}:${finalValue}`);
  };


  return (
    <div className="flex items-center gap-1.5">
      <Input
        id={id ? `${id}-hours` : undefined}
        type="text"
        pattern="\d*"
        maxLength={2}
        value={hours}
        onChange={handleHoursChange}
        onBlur={() => handleBlur('hours', hours, 2, 23)}
        className="w-14 h-9 text-center"
        disabled={disabled}
        placeholder="HH"
      />
      <span className="font-semibold">:</span>
      <Input
        id={id ? `${id}-minutes` : undefined}
        type="text"
        pattern="\d*"
        maxLength={2}
        value={minutes}
        onChange={handleMinutesChange}
        onBlur={() => handleBlur('minutes', minutes, 2, 59)}
        className="w-14 h-9 text-center"
        disabled={disabled}
        placeholder="mm"
      />
    </div>
  );
};