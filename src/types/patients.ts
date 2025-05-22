import type { Company } from './companies'; // Assuming these types are defined
import type { Subcompany } from './companies';
import type { CompanyRelation } from './companies';
import type { Doctor } from './doctors'; // Assuming this type is defined
import { User } from './index'; // Assuming User type from a general index.ts or auth types
// import { Country } from './locations'; // If you have a Country type

export interface Patient {
  id: number;
  name: string;
  shift_id: number; // Should probably also have Shift object if loaded
  user_id: number;  // User who registered/is responsible for this patient entry
  user?: User;     // Optional: loaded User object

  doctor_id?: number | null;
  doctor?: Doctor; // Optional: loaded Doctor object

  phone: string; // Original schema: varchar(10) - consider if this is too short
  gender: string; // Consider 'male' | 'female' | 'other' if using an enum on backend

  age_day?: number | null;
  age_month?: number | null;
  age_year?: number | null;

  company_id?: number | null;
  company?: Company; // Optional: loaded Company object
  subcompany_id?: number | null;
  subcompany?: Subcompany; // Optional: loaded Subcompany object
  company_relation_id?: number | null;
  company_relation?: CompanyRelation; // Optional: loaded CompanyRelation object

  paper_fees?: number | null;
  guarantor?: string | null;
  expire_date?: string | null; // Date string, e.g., "YYYY-MM-DD"
  insurance_no?: string | null;

  is_lab_paid: boolean;
  lab_paid: number; // Consider decimal if partial payments
  result_is_locked: boolean;
  sample_collected: boolean;
  sample_collect_time?: string | null; // Time string, e.g., "HH:MM:SS"
  result_print_date?: string | null;  // DateTime string (ISO 8601)
  sample_print_date?: string | null;  // DateTime string

  visit_number: number;
  result_auth: boolean;
  auth_date: string; // DateTime string

  // Clinical Information (many are TEXT or VARCHAR in schema, default empty string or NOT NULL)
  present_complains: string;
  history_of_present_illness: string;
  procedures: string;
  provisional_diagnosis: string;
  bp: string; // Blood Pressure, e.g., "120/80"
  temp: number; // Temperature (decimal(8,2) in migration)
  weight: number; // (decimal(8,2) in migration)
  height: number; // (decimal(8,2) in migration)

  // Boolean clinical signs (nullable in schema)
  juandice?: boolean | null;
  pallor?: boolean | null;
  clubbing?: boolean | null;
  cyanosis?: boolean | null;
  edema_feet?: boolean | null;
  dehydration?: boolean | null;
  lymphadenopathy?: boolean | null;
  peripheral_pulses?: boolean | null;
  feet_ulcer?: boolean | null;

  country_id?: number | null;
  // country?: Country; // Optional: loaded Country object
  gov_id?: string | null; // Governorate ID or name

  prescription_notes?: string | null;
  address?: string | null;
  heart_rate?: string | null;
  spo2?: string | null; // Oxygen saturation
  discount: number; // double in schema, (decimal in migration)
  
  drug_history: string;
  family_history: string;
  rbs: string; // Random Blood Sugar

  doctor_finish: boolean;
  care_plan: string;
  doctor_lab_request_confirm: boolean;
  doctor_lab_urgent_confirm: boolean;

  // Systemic review / Examination notes (VARCHAR(255) NOT NULL in schema)
  // If they have defaults like '' in the DB, they won't be null.
  general_examination_notes: string;
  patient_medical_history: string;
  social_history: string;
  allergies: string;
  general: string; // General appearance/examination
  skin: string;
  head: string;
  eyes: string;
  ear: string;
  nose: string;
  mouth: string;
  throat: string;
  neck: string;
  respiratory_system: string;
  cardio_system: string;
  git_system: string; // Gastrointestinal
  genitourinary_system: string;
  nervous_system: string;
  musculoskeletal_system: string;
  neuropsychiatric_system: string;
  endocrine_system: string;
  peripheral_vascular_system: string;
  referred: string; // e.g., to another specialist/department
  discount_comment: string;

  // Timestamps
  created_at: string; // DateTime string (ISO 8601)
  updated_at: string; // DateTime string

  // You might add fields dynamically or from related tables for UI purposes:
  // status?: 'waiting' | 'with_doctor' | 'completed'; // Example for clinic workspace
  // last_visit_date?: string;
}

// For Patient Registration Form Data (might be a subset or include temp fields)
export interface PatientFormData {
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | undefined; // Undefined for initial select state
  
  age_year?: number | null; // Input as number | null, then parse
  age_month?: number | null;
  age_day?: number | null;
  doctor_shift_id: number; // Input as string from select
  // address?: string;
  
  doctor_id: number | undefined; // Input as string from select
  company_id?: number | null; // Input as string from select
 
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
  status: 'waiting' | 'with_doctor' | 'lab_pending' | 'imaging_pending' | 'payment_pending' | 'completed' | 'cancelled' | 'no_show';
  requested_services_count: number;
  created_at: string;
  updated_at: string;
}