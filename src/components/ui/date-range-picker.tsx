// src/components/ui/date-range-picker.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { arSA, enUS } from 'date-fns/locale';
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils"
import { Button,  ButtonProps } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  align?: "start" | "center" | "end";
  buttonSize?: ButtonProps["size"];
  buttonVariant?: ButtonProps["variant"];
  disabled?: boolean;
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  align = "start",
  buttonSize = "sm",
  buttonVariant = "outline",
  disabled = false,
}: DatePickerWithRangeProps) {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language.startsWith('ar') ? arSA : enUS;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={buttonVariant}
            size={buttonSize}
            disabled={disabled}
            className={cn(
              "w-auto justify-start text-left font-normal h-7 px-2", // Adjusted for smaller size
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="ltr:mr-1 rtl:ml-1 h-3.5 w-3.5" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: dateLocale })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: dateLocale })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: dateLocale })
              )
            ) : (
              <span>{t('datePicker.pickDateRange', 'Pick a date range')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={dateLocale}
            dir={i18n.dir()}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}