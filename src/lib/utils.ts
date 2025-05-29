import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with thousand separators based on the locale
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param locale - The locale to use for formatting (default: current i18n locale)
 * @returns Formatted string with thousand separators
 */
export const formatNumber = (value: number | string, decimals: number = 2, locale?: string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};
