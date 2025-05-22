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