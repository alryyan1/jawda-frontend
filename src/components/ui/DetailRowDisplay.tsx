// src/components/ui/DetailRowDisplay.tsx
import React from 'react';
import { cn } from "@/lib/utils"; // Your shadcn/ui utility for conditional classes
import { useTranslation } from 'react-i18next'; // For default "N/A"

interface DetailRowDisplayProps {
  label: string;
  value?: string | number | React.ReactNode | null; // Allow ReactNode for rich values like Badges
  icon?: React.ElementType; // Icon component like from lucide-react
  valueClassName?: string;    // Optional class for the value part
  labelClassName?: string;    // Optional class for the label part
  containerClassName?: string; // Optional class for the row container
  titleValue?: string;      // For HTML title attribute on truncated values
  isLoading?: boolean;        // To show a loading shimmer/placeholder
  unit?: string; // Added unit prop
}

const DetailRowDisplay: React.FC<DetailRowDisplayProps> = ({
  label,
  value,
  icon: Icon,
  valueClassName,
  labelClassName,
  containerClassName,
  titleValue,
  isLoading = false,
  unit, // Added unit prop
}) => {
  const { t } = useTranslation("common"); // For "N/A" or loading text

  const displayValue = value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
    ? <span className="text-xs italic text-slate-400 dark:text-slate-500">{t('notAvailable_short', 'N/A')}</span>
    : (
      <span>
        {value}
        {unit && <span className="text-xs text-muted-foreground ltr:ml-1 rtl:mr-1">{unit}</span>}
      </span>
    );

  if (isLoading) {
    return (
        <div className={cn("grid grid-cols-[auto_1fr] items-center gap-x-2 py-1.5 animate-pulse", containerClassName)}>
            {Icon ? <Icon className={cn("h-4 w-4 text-muted-foreground", labelClassName)} /> : <div className="w-4"/>}
            <div className="min-w-0">
                <p className={cn("text-xs text-muted-foreground h-3 bg-muted rounded w-1/2", labelClassName)}>{/* {label} */}</p>
                <div className={cn("text-sm font-medium h-4 bg-muted rounded w-3/4 mt-0.5", valueClassName)} />
            </div>
        </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-[auto_1fr] items-start gap-x-2 py-1.5", containerClassName)}>
      {Icon ? (
        <Icon className={cn("h-4 w-4 text-muted-foreground mt-0.5", labelClassName)} />
      ) : (
        <div className="w-4 flex-shrink-0" /> /* Placeholder for alignment if no icon */
      )}
      <div className="min-w-0 flex-grow"> {/* For truncation and proper flex behavior */}
        <p className={cn("text-xs text-muted-foreground", labelClassName)}>{label}:</p>
        <div
          className={cn("text-sm font-medium truncate", valueClassName)}
          title={titleValue || (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined)}
        >
          {displayValue}
        </div>
      </div>
    </div>
  );
};

export default DetailRowDisplay;