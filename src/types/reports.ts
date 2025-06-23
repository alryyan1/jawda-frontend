// src/types/reports.ts (or shifts.ts if DoctorShift type is there)
import type  { DoctorStripped } from './doctors';
import type { UserStripped } from './users'; // Assuming UserStripped type
import type { Shift } from './shifts'; // General clinic shift type

export interface DoctorShiftReportItem {
  id: number;
  doctor_name: string;
  general_shift_name?: string;
  shift_id: number;
  formatted_start_time: string;
  formatted_end_time?: string;
  duration?: string;
  status: boolean;
  status_text: string;
  user_name?: string;
}

export interface PaginatedDoctorShiftReportResponse {
  data: DoctorShiftReportItem[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}
export interface ServiceStatisticItem {
  id: number; // Service ID
  name: string;
  price: number;
  activate: boolean;
  service_group_id: number;
  service_group_name?: string | null;
  request_count: number;
  // total_revenue?: number;
}

export interface PatientVisitFinancialBreakdown {
  patient_id: number;
  patient_name: string;
  visit_id: number;
  total_paid_for_visit: number;
  doctor_share_from_visit: number;
  is_insurance_patient: boolean;
}

export interface DoctorShiftFinancialSummary {
  doctor_shift_id: number;
  doctor_name: string;
  start_time?: string | null;
  end_time?: string | null;
  status: string; // 'Open' or 'Closed'
  total_patients: number;
  doctor_fixed_share_for_shift: number;
  doctor_cash_share_total: number;
  doctor_insurance_share_total: number;
  total_doctor_share: number;
  patients_breakdown: PatientVisitFinancialBreakdown[];
}
export interface DailyServiceIncomeData {
  date: string; // YYYY-MM-DD
  total_income: number;          // Sum of deposits for the day
  total_cash_income: number;
  total_bank_income: number;
  total_cost: number;            // Sum of costs for the day
  net_cash: number;              // cash_income - cash_costs
  net_bank: number;              // bank_income - bank_costs
  net_income_for_day: number;    // total_income - total_cost
}

export interface MonthlyServiceIncomeSummary {
  total_deposits: number;
  total_cash_deposits: number;
  total_bank_deposits: number;
  total_costs_for_days_with_deposits: number;
  net_total_income: number;
  net_cash_flow: number;
  net_bank_flow: number;
}

export interface MonthlyServiceIncomeReportResponse {
  daily_data: DailyServiceIncomeData[];
  summary: MonthlyServiceIncomeSummary;
  report_period: {
    month_name: string;
    from: string;
    to: string;
  };
}

// src/types/reports.ts (or similar)

export interface ServiceCostBreakdownItem {
  sub_service_cost_id: number;
  sub_service_cost_name: string;
  total_amount: number;
}

export interface ServiceCostBreakdownReportResponse {
  data: ServiceCostBreakdownItem[];
  grand_total_cost: number;
  report_period: {
    from: string;
    to: string;
  };
}

// src/types/reports.ts
// ... (existing types) ...

export interface DoctorStatisticItem {
  doctor_id: number;
  doctor_name: string;
  specialist_name: string;
  patient_count: number;
  total_income_generated: number; // Total revenue from this doctor's visits
  cash_entitlement: number;
  insurance_entitlement: number;
  total_entitlement: number; // Sum of cash + insurance entitlements (+ static if applicable)
}

export interface DoctorStatisticsReportResponse {
  data: DoctorStatisticItem[];
  report_period: {
    from: string;
    to: string;
  };
  // Optionally add grand_totals here if backend calculates and returns them separately
}

// src/types/reports.ts
// ... (existing types) ...

export interface CompanyPerformanceItem {
  company_id: number;
  company_name: string;
  patient_count: number;
  total_income_generated: number;    // Gross value of services provided to their patients (after discounts)
  total_endurance_by_company: number; // Total amount covered by company
  net_income_from_company_patients: number; // Income - Endurance (what patient paid or clinic received beyond endurance)
}

export interface CompanyPerformanceReportResponse {
  data: CompanyPerformanceItem[];
  report_period: {
    from: string;
    to: string;
  };
  // Add grand_totals if backend sends them separately for easier frontend display
  // grand_totals?: {
  //   total_patient_count: number;
  //   total_income: number;
  //   total_endurance: number;
  //   total_net_income: number;
  // }
}
// src/types/reports.ts
// ... (existing types) ...

export interface DoctorCompanyEntitlementItem {
  company_id: number;
  company_name: string;
  total_entitlement: number;
}

export interface DoctorCompanyEntitlementReportResponse {
  data: DoctorCompanyEntitlementItem[];
  doctor_name: string;
  report_period: {
    from: string;
    to: string;
  };
  grand_total_entitlement: number;
}

// src/types/reports.ts
// ... (existing types) ...

export interface MonthlyIncomeDataPoint {
  month: number; // 1-12 or a string like 'Jan' if backend sends it
  month_name: string; // Localized month name from backend
  total_income: number;
}

export interface YearlyIncomeComparisonResponse {
  data: MonthlyIncomeDataPoint[];
  meta: {
    year: number;
    total_yearly_income: number;
    average_monthly_income: number;
    // month_labels_for_chart?: string[];
  };
}
// src/types/reports.ts
// ... (existing types) ...

export interface MonthlyPatientCountDataPoint {
  month: number;
  month_name: string;
  patient_count: number;
}

export interface YearlyPatientFrequencyReportResponse {
  data: MonthlyPatientCountDataPoint[];
  meta: {
    year: number;
    total_unique_patients_yearly: number;
    average_monthly_patients: number;
  };
}

// src/types/reports.ts

// ... (existing types) ...

export interface DailyLabIncomeData {
  date: string; // YYYY-MM-DD
  total_lab_income_paid: number;
  total_lab_cash_paid: number;
  total_lab_bank_paid: number;
}

export interface MonthlyLabIncomeSummary {
  total_lab_income_paid: number;
  total_lab_cash_paid: number;
  total_lab_bank_paid: number;
}

export interface MonthlyLabIncomeReportResponse {
  daily_data: DailyLabIncomeData[];
  summary: MonthlyLabIncomeSummary;
  report_period: {
    month_name: string;
    from: string;
    to: string;
  };
}

export interface DoctorShiftReportItem {
  id: number; // DoctorShift ID
  doctor_id: number; // Added for consistency
  doctor_name: string;
  doctor_specialist_name?: string; // NEW: from Doctor model
  general_shift_id?: number; // NEW: if you want to show general shift ID
  general_shift_name?: string; // Or just the name
  formatted_start_time: string;
  formatted_end_time?: string;
  duration?: string;
  status: boolean; // true for open, false for closed
  status_text: string; // "Open", "Closed"
  user_id_opened?: number; // NEW: User who opened the DoctorShift
  user_name_opened?: string; // NEW: Name of the user who opened

  // Financials (ideally from backend, or fetched on demand)
  total_doctor_entitlement?: number;
  cash_entitlement?: number;
  insurance_entitlement?: number;
  static_wage_applied?: number; // If static wage was part of total entitlement

  // Proofing flags (from DoctorShift model)
  is_cash_revenue_prooved?: boolean;
  is_cash_reclaim_prooved?: boolean;
  is_company_revenue_prooved?: boolean;
  is_company_reclaim_prooved?: boolean;
}
