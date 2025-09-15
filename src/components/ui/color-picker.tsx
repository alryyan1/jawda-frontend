import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeColorOptions } from '@/lib/colors';

interface ColorPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      {label && (
        <div>
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-5 gap-2">
        {themeColorOptions.map((colorOption) => (
          <button
            key={colorOption.value}
            type="button"
            onClick={() => !disabled && onValueChange(colorOption.value)}
            disabled={disabled}
            className={cn(
              "relative w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2",
              value === colorOption.value
                ? "border-gray-900 dark:border-gray-100 ring-2 ring-offset-2 ring-primary"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
              disabled && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
            style={{ backgroundColor: colorOption.color }}
            title={colorOption.name}
          >
            {value === colorOption.value && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="h-5 w-5 text-white drop-shadow-lg" />
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground">
        Selected: {themeColorOptions.find(c => c.value === value)?.name || 'Custom'}
      </div>
    </div>
  );
}; 