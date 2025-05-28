// src/types/dashboard.ts or src/types/shifts.ts



// For closing a shift, data needed by the backend
export interface CloseShiftFormData {
  total: string; // Input as string
  bank: string;
  expenses: string;
  touched?: boolean; // Optional
  // Potentially notes or other reconciliation fields
}

// src/types/dashboard.ts
export interface DashboardSummary {
  patientsToday: number;
  doctorsOnShift: number;
  revenueToday: number;
  appointmentsToday: number;
}
