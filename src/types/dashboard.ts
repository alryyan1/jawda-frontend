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

export interface FinancialSummary {
  lab_revenue: {
    cash: number;
    bank: number;
    total: number;
  };
  services_revenue: {
    cash: number;
    bank: number;
    total: number;
  };
  costs: {
    cash: number;
    bank: number;
    total: number;
  };
  net: number;
  net_cash?: number;
  net_bank?: number;
  total_refunds?: number;
  total_discounts?: number;
  patients_count?: number;
}