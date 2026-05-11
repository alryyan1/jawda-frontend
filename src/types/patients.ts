import type { Company } from "@/types/companies"; // Assuming these types are defined
import type { Subcompany } from "@/types/companies";
import type { CompanyRelation } from "@/types/companies";
import type { DoctorStripped } from "./doctors";
import type { DoctorVisit } from "./visits";
import type { UserStripped } from "./auth";
// import type { Doctor } from "./doctors"; // Assuming this type is defined
// import { User } from "./index"; // Assuming User type from a general index.ts or auth types
// import { Country } from './locations'; // If you have a Country type

// For Patient Registration Form Data (might be a subset or include temp fields)
export interface PatientFormData {
  name: string;
  phone: string;
  gender: "male" | "female" | "other" | undefined; // Undefined for initial select state
  is_online?: boolean; // For new field in patient registration

  age_year?: number | null; // Input as number | null, then parse
  age_month?: number | null;
  age_day?: number | null;
  doctor_shift_id: number | null; // Input as string from select
  // address?: string;

  doctor_id: number | undefined; // Input as string from select
  company_id?: number | null; // Input as string from select
  // Company-specific fields
  insurance_no?: string;
  guarantor?: string;
  subcompany_id?: string | undefined;
  company_relation_id?: string | undefined;
  expire_date?: Date | undefined; // For shadcn DatePicker
  // Discount comment (patient-level)
  discount_comment?: string | null;
  // New fields
  social_status?: "single" | "married" | "widowed" | "divorced" | null;
  income_source?: string | null;
  // Enhanced Demographic Data
  gov_id?: string | null;
  email?: string | null;
  nationality?: string | null;
  dob?: Date | null;
  from_addmission_page?: boolean;
}
// src/types/patients.ts
// ... (Patient, PatientFormData) ...
export interface PatientSearchResult {
  id: number;
  name: string;
  phone?: string | null;
  gender?: "male" | "female" | "other";
  age_year?: number | null;
  last_visit_id?: number | null;
  last_visit_date?: string | null;
  last_visit_doctor_name?: string | null;
  last_visit_doctor_id?: number | null;
  last_visit_file_id?: number | null;
  last_visit_company_name?: string | null;
  last_visit_company_id?: number | null;
  patient_id?: number | null;
}
// --- NEW/VERIFY: PatientStripped Interface ---
export interface PatientStripped {
  id: number;
  name: string;
  phone?: string; // Optional, but often useful
  gender?: "male" | "female" | "other"; // Optional
  // You can add age_year or a computed age_string if frequently needed with stripped info
  // age_year?: number | null;
  visit_number?: number | null;
}

// For paginated responses if you have a patient list API
export interface PaginatedPatientsResponse {
  data: Patient[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}
/**
 * Lean visit shape returned by GET /clinic-active-patients (DoctorVisitListItemResource).
 * Only fields actually consumed by the list/card UI are required.
 * Fields from the full DoctorVisitResource (admission page, report page) are optional.
 */
export interface ActivePatientVisit {
  // --- Core fields (always present from lean resource) ---
  id: number;
  number: number;
  queue_number: number | null;
  status:
    | "waiting"
    | "with_doctor"
    | "lab_pending"
    | "imaging_pending"
    | "payment_pending"
    | "completed"
    | "cancelled"
    | "no_show";
  is_online: boolean;
  is_new: boolean;
  only_lab: boolean;
  balance_due: number;
  requested_services_count: number;
  doctor_id: number;
  doctor_shift_id: number;
  /** Slim company object for card styling; null for cash patients. */
  company: { id: number; name: string } | null;
  patient: {
    id: number;
    name: string;
    phone: string | null;
    gender: "male" | "female" | "other";
    age_year: number | null;
    age_month: number | null;
    age_day: number | null;
    full_age: string;
    company_id: number | null;
    company: { id: number; name: string; status: boolean } | null;
    /** Loaded only by the admission-patients-by-date endpoint (full resource). */
    admission?: {
      id: number;
      bed_id: number | null;
      ward?: { id: number; name: string };
      room?: { id: number; room_number: string };
      bed?: { id: number; bed_number: string; room?: { room_number: string } };
      requested_surgeries_summary?: { total_initial: number; paid: number; balance: number };
    } | null;
  };

  // --- Fields present only in the full DoctorVisitResource ---
  patient_id?: number;
  patient_subcompany?: any | null;
  doctor?: { id: number; name: string; specialist_name: string | null } | null;
  doctor_name?: string | null;
  user_id?: number;
  shift_id?: number;
  visit_time?: string | null;
  visit_time_formatted?: string | null;
  visit_type?: string | null;
  reason_for_visit?: string | null;
  visit_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  total_services_amount?: number;
  total_services_paid?: number;
  total_lab_amount?: number;
  total_paid?: number;
  total_discount?: number;
  total_lab_paid?: number;
  total_lab_discount?: number;
  total_lab_endurance?: number;
  total_lab_balance?: number;
  total_lab_value_will_pay?: number;
  lab_paid?: number;
  result_auth?: boolean;
  auth_date?: string | null;
  company_relation?: any | null;
  requested_services?: Array<{
    id: number;
    doctorvisits_id: number;
    service_id: number;
    service: {
      id: number;
      name: string;
      service_group_id: number;
      service_group_name: string;
      service_group: { id: number; name: string };
      price: number;
      activate: boolean;
      variable: boolean;
      created_at: string;
      updated_at: string;
    };
    user_id: number;
    user_deposited: number;
    doctor_id: number;
    price: number;
    amount_paid: number;
    endurance: number;
    is_paid: boolean;
    discount: number;
    discount_per: number;
    bank: boolean;
    count: number;
    doctor_note: string;
    nurse_note: string;
    done: boolean;
    approval: boolean;
    created_at: string;
    sub_total: number;
    net_payable: number | null;
    balance_due: number;
  }>;
  lab_requests?: any[];
  requested_services_summary?: Array<{
    id: number;
    service_name: string;
    price: number;
    count: number;
    amount_paid: number;
    is_paid: boolean;
    done: boolean;
  }>;
}
// src/types/patients.ts

// ... other types ...

export interface Patient {
  id: number;
  user_id: number;
  name: string;
  patient_id: number;
  lab_to_lab_object_id?: string | null;
  phone: string;
  gender: "male" | "female" | "other"; // Or string if backend doesn't strictly enforce enum
  age_year?: number | null;
  age_month?: number | null;
  sample_collected_by?: UserStripped;
  age_day?: number | null;
  address?: string | null;
  doctor: DoctorStripped;
  company_id?: number | null;
  company?: Company;
  result_is_locked: boolean;
  result_auth: boolean;
  result_auth_user?: number | null;
  result_url?: string | null;
  result_print_date?: string | null;
  auth_date?: string | null;
  doctor_visit?: DoctorVisit;
  has_cbc: boolean;
  subcompany_id?: number | null;
  subcompany?: Subcompany;
  user: UserStripped;

  company_relation_id?: number | null;
  company_relation?: CompanyRelation;

  insurance_no?: string | null;
  expire_date?: string | null; // YYYY-MM-DD
  guarantor?: string | null; // If you want to display this too
  // Patient-level discount comment
  discount_comment?: string | null;
  // New fields
  social_status?: "single" | "married" | "widowed" | "divorced" | null;
  income_source?: string | null;
  specialist_doctor?: DoctorStripped;

  // Enhanced Demographic Data
  gov_id?: string | null;
  email?: string | null;
  nationality?: string | null;
  dob?: string | null;

  // ... other existing patient fields ...
  created_at: string;
  updated_at: string;

  /** Active admission (when loaded via PatientResource, e.g. doctor-visits index) */
  admission?: { id: number; bed_id?: number | null; [key: string]: unknown } | null;
}

// Form data for the new EditPatientInfoDialog
// Excludes company_id from direct editing here.
export interface EditPatientFormData {
  name: string;
  phone: string;
  gender: "male" | "female" | "other" | undefined; // Allow undefined for select
  age_year?: string | null; // Keep as string for form input
  age_month?: string | null;
  age_day?: string | null;
  address?: string | null;

  // Insurance details (editable if company_id already exists)
  insurance_no?: string | null;
  expire_date?: string | null; // YYYY-MM-DD string from date picker
  guarantor?: string | null;
  subcompany_id?: string | null; // Will be string from select
  company_relation_id?: string | null; // Will be string from select
}

// Type for the API update payload (numbers for IDs)
export interface UpdatePatientApiPayload {
  name: string;
  phone: string;
  gender: "male" | "female" | "other";
  age_year?: number | null;
  age_month?: number | null;
  age_day?: number | null;
  address?: string | null;
  insurance_no?: string | null;
  expire_date?: string | null;
  guarantor?: string | null;
  subcompany_id?: number | null;
  company_relation_id?: number | null;
  discount_comment?: string | null;
}
// src/types/visits.ts (or wherever you keep visit related types)

// ... existing DoctorVisit, LabRequest types ...

export interface RecentDoctorVisitSearchItem {
  visit_id: number;
  patient_id: number;
  patient_name: string;
  patient_phone?: string | null;
  doctor_name?: string | null;
  doctor_shift_id?: number | null;
  visit_date?: string | null; // YYYY-MM-DD
  visit_time?: string | null;
  autocomplete_label: string; // For Autocomplete display
}
