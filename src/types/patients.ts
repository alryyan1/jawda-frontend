import type { Company } from "./companies"; // Assuming these types are defined
import type { Subcompany } from "./companies";
import type { CompanyRelation } from "./companies";
import type { Doctor } from "./doctors"; // Assuming this type is defined
import { User } from "./index"; // Assuming User type from a general index.ts or auth types
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
  last_visit_file_id?: number | null;
}
// --- NEW/VERIFY: PatientStripped Interface ---
export interface PatientStripped {
  id: number;
  name: string;
  phone?: string; // Optional, but often useful
  gender?: "male" | "female" | "other"; // Optional
  // You can add age_year or a computed age_string if frequently needed with stripped info
  // age_year?: number | null;
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
  patient: Patient;
  doctor?: {
    id: number;
    name: string;
  };
  status:
    | "waiting"
    | "with_doctor"
    | "lab_pending"
    | "imaging_pending"
    | "payment_pending"
    | "completed"
    | "cancelled"
    | "no_show";
  requested_services_count: number;
  created_at: string;
  updated_at: string;
}
// src/types/patients.ts

// ... other types ...

export interface Patient {
  id: number;
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other'; // Or string if backend doesn't strictly enforce enum
  age_year?: number | null;
  age_month?: number | null;
  age_day?: number | null;
  address?: string | null;
  
  company_id?: number | null;
  company?: Company;

  subcompany_id?: number | null;
  subcompany?: Subcompany;

  company_relation_id?: number | null;
  company_relation?: CompanyRelation;
  
  insurance_no?: string | null;
  expire_date?: string | null; // YYYY-MM-DD
  guarantor?: string | null; // If you want to display this too

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
}