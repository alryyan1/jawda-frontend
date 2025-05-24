// src/types/visits.ts (or where DoctorVisit is defined)
import type { Patient, PatientStripped } from "./patients";
import type { Doctor, DoctorShift, DoctorStripped } from "./doctors"; // Assuming DoctorShift is here
import type { User, UserStripped } from "./auth";
import type { Shift } from "./shifts";
import type { RequestedService } from "./services";
import type { ChildTest, Container } from "./labTests";
// import { Vital } from './vitals'; // When you add vitals
// import { ClinicalNote } from './notes'; // When you add notes

export interface DoctorVisit {
  // This is the detailed visit object
  id: number;
  visit_date: string;
  visit_time?: string | null;
  status: string;
  visit_type?: string | null;
  queue_number?: number | null;
  reason_for_visit?: string | null;
  visit_notes?: string | null;
  is_new: boolean;
  number: number;
  only_lab: boolean;

  patient_id: number;
  patient: Patient; // Full patient object

  doctor_id: number;
  doctor?: Pick<Doctor, "id" | "name" | "specialist_name">; // Or full Doctor object

  user_id: number;
  created_by_user?: Pick<User, "id" | "name" | "username">;

  shift_id: number;
  general_shift_details?: Shift;

  doctor_shift_id?: number | null;
  doctor_shift_details?: DoctorShift;

  requested_services?: RequestedService[];
  // vitals?: Vital[];
  // clinical_notes?: ClinicalNote[];

  created_at: string;
  updated_at: string;
}

export interface RequestedServiceSummary {
  // For the dialog
  id: number;
  service_name: string;
  price: number;
  count: number;
  amount_paid: number;
  is_paid: boolean;
  done: boolean;
}

export interface PatientVisitSummary {
  // Represents the items in the list
  id: number; // Visit ID
  visit_date: string;
  visit_time?: string | null;
  status: string;
  patient: PatientStripped; // Use stripped patient type
  doctor?: DoctorStripped; // Use stripped doctor type
  total_amount: number;
  total_paid: number;
  total_discount: number;
  balance_due: number;
  requested_services_summary?: RequestedServiceSummary[]; // For the dialog
}

// --- RequestedResult Type (ensure this is defined) ---
export interface RequestedResult {
  id: number;
  lab_request_id: number;
  patient_id: number;
  main_test_id: number;
  child_test_id: number;
  result?: string | null; // Actual result value
  normal_range?: string | null;
  unit_name?: string | null;
  flags?: string | null;
  result_comment?: string | null;
  entered_by_user_id?: number | null;
  entered_at?: string | null;
  authorized_by_user_id?: number | null;
  authorized_at?: string | null;
  // Add other fields from your requested_results table
}

export interface LabRequest {
  id: number;
  main_test_id: number;
  main_test?: MainTest; // CHANGED: Using full MainTest here as it contains childTests
  pid: number; // Patient ID
  patient_name?: string;
  patient?: PatientStripped;
  doctor_visit_id?: number | null;

  hidden: boolean;
  is_lab2lab: boolean;
  valid: boolean;
  no_sample: boolean;

  price: number;
  amount_paid: number;
  discount_per: number;
  is_bankak: boolean;
  comment?: string | null; // This is the comment for the LabRequest itself

  user_requested?: number | null;
  requesting_user_name?: string;
  requesting_user?: UserStripped;

  user_deposited?: number | null;
  deposit_user_name?: string;
  deposit_user?: UserStripped;

  approve: boolean;
  endurance: number;
  is_paid: boolean;

  sample_id?: string | null;
  created_at: string;
  updated_at: string;

  // --- ADD THIS ---
  results?: RequestedResult[]; // Array of results associated with this LabRequest
  // This will be populated by the backend when fetching for result entry
}

// Update MainTest type slightly if not already done, to include childTests for LabRequestResource's eager loading.
// This might already be in your types/labTests.ts
export interface MainTest {
  id: number;
  main_test_name: string;
  pack_id?: number | null;
  pageBreak: boolean;
  container_id: number;
  container_name?: string;
  container?: Container; // Assuming Container type exists
  price?: number | string | null;
  divided: boolean;
  available: boolean;
  childTests?: ChildTest[]; // <-- Ensure this is here
  // created_at?: string;
  // updated_at?: string;
}
