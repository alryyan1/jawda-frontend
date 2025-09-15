import React, { useState, useEffect } from "react";
import { getTodayDate } from "@/lib/dateUtils";

interface POSDatePickerProps {
  onDateChange?: (date: string) => void;
}

export const POSDatePicker: React.FC<POSDatePickerProps> = ({ onDateChange }) => {
  const [value, setValue] = useState<string>(getTodayDate());

  useEffect(() => {
    if (onDateChange) {
      onDateChange(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onDateChange) onDateChange(newValue);
  };

  return (
    <input
      type="date"
      value={value}
      onChange={handleChange}
      className="h-9 w-[180px] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    />
  );
};