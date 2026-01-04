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

  age_year?: number | null; // Input as number | null, then parse
  age_month?: number | null;
  age_day?: number | null;
  doctor_shift_id: number; // Input as string from select
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
  social_status?: 'single' | 'married' | 'widowed' | 'divorced' | null;
  income_source?: string | null;
}
// src/types/patients.ts
// ... (Patient, PatientFormData) ...
export interface PatientSearchResult {
  id: number;
  name: string;
  phone?: string | null;
  gender?: 'male' | 'female' | 'other';
  age_year?: number | null;
  last_visit_id?: number | null;
  last_visit_date?: string | null;
  last_visit_doctor_name?: string | null;
  last_visit_doctor_id?: number | null;
  last_visit_file_id?: number | null;
  last_visit_company_name?: string | null;
  last_visit_company_id?: number | null;
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
export interface ActivePatientVisit {
  id: number;
  created_at: string;
  visit_time: string | null;
  visit_time_formatted: string | null;
  status: "waiting" | "with_doctor" | "lab_pending" | "imaging_pending" | "payment_pending" | "completed" | "cancelled" | "no_show";
  visit_type: string | null;
  company: any | null;
  queue_number: number | null;
  number: number;
  reason_for_visit: string | null;
  visit_notes: string | null;
  is_new: boolean;
  only_lab: boolean;
  requested_services_count: number;
  patient_id: number;
  patient: {
    id: number;
    name: string;
    phone: string | null;
    gender: "male" | "female" | "other";
    age_year: number | null;
    age_month: number | null;
    age_day: number | null;
    full_age: string;
    doctor: {
      id: number;
      name: string;
      specialist_name: string | null;
    };
    result_is_locked: boolean;
    address: string | null;
    gov_id: string | null;
    company_id: number | null;
    company: any | null;
    subcompany_id: number | null;
    subcompany: any | null;
    company_relation_id: number | null;
    company_relation: any | null;
    insurance_no: string | null;
    expire_date: string | null;
    guarantor: string | null;
    paper_fees: number;
    is_lab_paid: boolean;
    lab_paid: number;
    sample_collected: boolean;
    sample_collect_time: string | null;
    result_print_date: string | null;
    sample_print_date: string | null;
    visit_number: number;
    result_auth: boolean;
    auth_date: string | null;
    discount: number;
    discount_comment: string;
    doctor_finish: boolean;
    doctor_lab_request_confirm: boolean;
    doctor_lab_urgent_confirm: boolean;
    created_at: string;
    updated_at: string;
    user: {
      id: number;
      name: string;
      username: string;
    };
    has_cbc: boolean;
    result_url: string | null;
    doctor_in_patient: string | null;
  };
  patient_subcompany: any | null;
  doctor_id: number;
  doctor: {
    id: number;
    name: string;
    specialist_name: string | null;
  };
  doctor_name: string;
  user_id: number;
  shift_id: number;
  doctor_shift_id: number;
  total_lab_amount: number;
  total_paid: number;
  total_discount: number;
  balance_due: number;
  total_lab_paid: number;
  total_lab_discount: number;
  total_lab_endurance: number;
  total_lab_balance: number;
  total_services_amount: number;
  total_services_paid: number;
  total_lab_value_will_pay: number;
  lab_paid: number;
  company_relation: any | null;
  result_auth: boolean;
  auth_date: string | null;
  requested_services: Array<{
    id: number;
    doctorvisits_id: number;
    service_id: number;
    service: {
      id: number;
      name: string;
      service_group_id: number;
      service_group_name: string;
      service_group: {
        id: number;
        name: string;
      };
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
  lab_requests: any[];
  requested_services_summary: Array<{
    id: number;
    service_name: string;
    price: number;
    count: number;
    amount_paid: number;
    is_paid: boolean;
    done: boolean;
  }>;
  updated_at: string;
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
  gender: 'male' | 'female' | 'other'; // Or string if backend doesn't strictly enforce enum
  age_year?: number | null;
  age_month?: number | null;
  sample_collected_by?: UserStripped;
  age_day?: number | null;
  address?: string | null;
  doctor:DoctorStripped;
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
  user:UserStripped;

  company_relation_id?: number | null;
  company_relation?: CompanyRelation;
  
  insurance_no?: string | null;
  expire_date?: string | null; // YYYY-MM-DD
  guarantor?: string | null; // If you want to display this too
  // Patient-level discount comment
  discount_comment?: string | null;
  // New fields
  social_status?: 'single' | 'married' | 'widowed' | 'divorced' | null;
  income_source?: string | null;
  specialist_doctor_id?: number | null;
  specialist_doctor?: DoctorStripped;

  // ... other existing patient fields ...
  created_at: string;
  updated_at: string;
}

// Form data for the new EditPatientInfoDialog
// Excludes company_id from direct editing here.
export interface EditPatientFormData {
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | undefined; // Allow undefined for select
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
  gender: 'male' | 'female' | 'other';
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