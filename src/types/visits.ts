// src/types/visits.ts

import type { Patient, PatientStripped } from "./patients";
import type { DoctorShift, DoctorStripped } from "./doctors";
import type { UserStripped } from "./auth"; // Assuming UserStripped is here or in users.ts
import type { Shift } from "./shifts";
import type { Service, RequestedServiceDeposit } from "./services"; // Assuming RequestedServiceDeposit is here
import type { ChildTest, MainTest } from "./labTests"; // MainTest now includes childTests
import type { Company } from "./companies";

// --- RequestedResult based on your latest decision to include tracking fields ---
export interface RequestedResult {
  id: number;
  lab_request_id: number;
  patient_id: number;
  main_test_id: number;
  child_test_id: number;
  result: string; // Default ''
  normal_range: string; // Snapshot, NOT NULL
  unit_id?: number | null; // FK
  unit_name?: string | null; // For display from eager loaded Unit

  // Fields you want to add back
  flags?: string | null;
  result_comment?: string | null;
  entered_by_user_id?: number | null;
  entered_by_user_name?: string | null; // For display
  entered_at?: string | null; // ISO Date string
  authorized_by_user_id?: number | null;
  authorized_by_user_name?: string | null; // For display
  authorized_at?: string | null; // ISO Date string
  
  created_at?: string;
  updated_at?: string;

  // Optional: If you load ChildTest definition with the result
  childTest?: ChildTest;
}

// --- LabRequest ---
export interface LabRequest {
  id: number;
  main_test_id: number;
  main_test?: MainTest; // Eager loaded with childTests for result entry
  pid: number; // Patient ID
  patient_name?: string; // Denormalized for quick display in some lists
  patient?: PatientStripped | Patient; // Eager loaded patient summary or full patient data
  doctor_visit_id?: number | null; // Link to the DoctorVisit

  hidden: boolean;
  is_lab2lab: boolean;
  valid: boolean;
  no_sample: boolean;

  price: number; // string from form, number from API
  count: number; // Number of times this test is requested (usually 1 for lab)
  amount_paid: number;
  discount_per: number; // Percentage
  is_bankak: boolean; // Payment method for this request
  comment?: string | null; // Overall comment for this lab request

  user_requested?: number | null; // User ID
  requesting_user_name?: string;
  requesting_user?: UserStripped;

  user_deposited?: number | null; // User ID who handled payment
  deposit_user_name?: string;
  deposit_user?: UserStripped;

  approve: boolean; // Overall authorization status of the lab request
  endurance: number; // Amount covered by insurance/company
  is_paid: boolean;

  sample_id?: string | null;
  sample_collected_at?: string | null; // ISO Date string when sample was collected
  sample_collected_by_user_id?: number | null; // User who collected the sample
  sampleCollectedBy?: UserStripped; // Eager loaded user who collected sample
  result_status?: 'pending_sample' | 'sample_received' | 'pending_entry' | 'results_partial' | 'results_complete_pending_auth' | 'authorized' | 'cancelled' | string; // Status of results
  authorized_by_user_id?: number | null; // User who authorized the whole request
  authorized_by_user_name?: string;
  authorized_at?: string | null; // Timestamp of LabRequest authorization
  payment_shift_id?: number | null; // Shift when payment for this request was made

  created_at: string;
  updated_at: string;

  results?: RequestedResult[]; // Array of results associated with this LabRequest
  requested_organisms?: RequestedOrganism[]; // For culture tests
}

// --- RequestedOrganism (for culture results) ---
export interface RequestedOrganism {
  id: number;
  lab_request_id: number;
  organism: string;
  sensitive: string; // Could be a comma-separated list or structured JSON
  resistant: string; // Could be a comma-separated list or structured JSON
}


// --- RequestedService (Clinical Service requested during a visit) ---
export interface RequestedService {
  id: number;
  doctorvisits_id: number; // FK to DoctorVisit
  service_id: number;
  service?: Service; // Eager-loaded service details
  user_id: number; // User who added the service to visit
  user_name?: string;
  user_deposited_id?: number | null; // User who handled payment for this service
  user_deposited_name?: string | null;
  doctor_id: number; // Doctor who ordered/performed
  doctor_name?: string;

  price: number; // Price at the time of request (could be from contract or standard)
  count: number;
  amount_paid: number; // Total paid specifically for this service instance
  endurance: number; // Amount company covers for this service instance
  is_paid: boolean;
  discount: number; // Fixed discount amount
  discount_per: number; // Percentage discount
  bank: boolean; // If the primary/last payment for this service was bank

  doctor_note: string | null;
  nurse_note: string | null;
  done: boolean; // If the service was performed
  approval: boolean; // If this service needed specific approval (e.g., insurance)

  created_at: string;
  updated_at: string;
  deposits?: RequestedServiceDeposit[]; // If tracking multiple payments per service
  // costBreakdown?: RequestedServiceCost[]; // If you have this
}

// --- DoctorVisit ---
export interface DoctorVisit {
  id: number;
  patient_id: number;
  patient: Patient; // Full patient object, or PatientStripped if that's enough for most views
  auth_date: string | null;
  doctor_id: number;
  doctor?: DoctorStripped; // Or full Doctor object
  result_auth: boolean | null;


  user_id: number; // User who created the visit entry (e.g., receptionist)
  created_by_user?: UserStripped;

  shift_id: number; // General clinic shift ID
  general_shift_details?: Shift;

  doctor_shift_id?: number | null; // Specific doctor's working session ID
  doctor_shift?: DoctorShift; // Eager loaded DoctorShift details

  file_id?: number | null; // Medical file number/ID for this encounter sequence

  visit_date: string; // YYYY-MM-DD
  visit_time?: string | null; // HH:MM:SS
  status: 'waiting' | 'with_doctor' | 'lab_pending' | 'imaging_pending' | 'payment_pending' | 'completed' | 'cancelled' | 'no_show' | string;
  visit_type?: string | null; // e.g., New, Follow-up, Emergency
  queue_number?: number | null;
  number: number; // The sequential number of this visit for the patient, or within the shift
  

  reason_for_visit?: string | null;
  visit_notes?: string | null; // General notes for the visit by doctor/reception

  is_new: boolean; // Is it a new patient complaint/episode?
  only_lab: boolean; // Is this visit *only* for lab tests without doctor consultation?

  company?: Company; // Eager loaded if patient is insured

  requested_services?: RequestedService[];
  lab_requests?: LabRequest[];
  // vitals?: Vital[];
  // clinical_notes?: ClinicalNote[];
  // prescriptions?: Prescription[];

  created_at: string;
  updated_at: string;

  // For UI convenience in lists, calculated by backend or frontend
  total_amount?: number;
  total_paid?: number;
  balance_due?: number;
  total_discount?:number;
  total_lab_amount?: number;
  total_lab_paid?: number;
  total_lab_balance?: number;
  requested_services_count?: number; // Count of services for this visit

}

// --- For UI Lists (e.g., TodaysPatientsPage) ---
export interface RequestedServiceSummary {
  id: number; // requested_service_id
  service_name: string;
  price: number;
  count: number;
  amount_paid: number;
  is_paid: boolean;
  done: boolean;
}

export interface PatientVisitSummary {
  id: number; // Visit ID
  visit_date: string;
  visit_time?: string | null;
  visit_time_formatted?: string | null;
  status: string;
  visit_type?: string | null;

  patient: Patient;
  patient_id?: number;
  total_services_amount: number;
  total_services_paid: number;
  lab_paid: number;
  total_lab_value_will_pay: number;
 
  doctor?: DoctorStripped | null;
  doctor_id?: number | null;
  doctor_name?: string | null;

  shift_id?: number;
  doctor_shift_id?: number | null;
  doctor_shift_details?: Partial<DoctorShift> | null;

  number: number;
  queue_number?: number | null;
  reason_for_visit?: string | null;
  visit_notes?: string | null;

  is_new: boolean;
  only_lab: boolean;
  company?: Company | null;

  total_amount: number;
  total_paid: number;
  total_discount: number;
  balance_due: number;
  total_lab_amount?: number;
  total_lab_paid?: number;
  total_lab_discount?: number;
  total_lab_balance?: number;
  requested_services_count?: number | null;

  requested_services?: RequestedService[];
  lab_requests?: LabRequest[];
  requested_services_summary?: RequestedServiceSummary[];

  created_at: string;
  updated_at?: string;
  // You might add a summary for lab requests too if needed in the dialog
  // lab_requests_summary?: { test_name: string; price: number; is_paid: boolean }[];
}