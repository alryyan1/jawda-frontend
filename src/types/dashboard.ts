// src/types/dashboard.ts or src/types/shifts.ts
import type { Shift } from './shifts'; // Existing Shift type

export interface DashboardSummary {
  patientsToday: number;
  doctorsOnShift: number;
  revenueToday: number; // Or string formatted
  appointmentsToday: number;
  // ... other summary data points
}

// For closing a shift, data needed by the backend
export interface CloseShiftFormData {
  total: string; // Input as string
  bank: string;
  expenses: string;
  touched?: boolean; // Optional
  // Potentially notes or other reconciliation fields
}