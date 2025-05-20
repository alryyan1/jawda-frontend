// src/types/doctors.ts
import { User } from './index'; // Assuming User type is in index.ts

export interface Specialist {
  id: number;
  name: string;
}

export interface FinanceAccount {
  id: number;
  name: string;
  // add other fields if needed by UI
}

export interface Doctor {
  id: number;
  name: string;
  phone: string;
  cash_percentage: number | string; // string if API returns it as string, number if casted
  company_percentage: number | string;
  static_wage: number | string;
  lab_percentage: number | string;
  specialist_id: number;
  specialist_name?: string; // from eager loading
  specialist?: Specialist; // if you embed the whole object
  start: number;
  image?: string | null; // path to image
  image_url?: string | null; // full URL for display
  finance_account_id?: number | null;
  finance_account_name?: string;
  finance_account_id_insurance: number;
  insurance_finance_account_name?: string;
  calc_insurance: boolean;
  user_id?: number | null;
  username?: string;
  user?: User; // if you embed the whole user object
  created_at: string;
  updated_at: string;
}
// For Doctor Form Data
export interface DoctorFormData {
  name: string;
  phone: string;
  cash_percentage: string; // Input as string, convert to number
  company_percentage: string;
  static_wage: string;
  lab_percentage: string;
  specialist_id: string | undefined; // From select, will be string
  start: string; // Input as string
  image_file?: File | null; // For new image upload
  image?: string | null; // Existing image path (for edit view)
  finance_account_id?: string | undefined;
  finance_account_id_insurance: string | undefined;
  calc_insurance: boolean;
  // user_id_to_link?: string | undefined; // If linking to an existing user during creation/edit
}


export interface PaginatedDoctorsResponse {
  data: Doctor[];
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

// If DoctorShift is a new concept
export interface DoctorShift {
  id: number; // This is the ID of the doctor_shift record itself
  doctor_id: number;
  doctor_name: string;
  status: string | number; // Or a more specific enum: 'active', 'on_break', 'ended'
  shift_id: number; // FK to the main clinic shifts table
  // Add start_time, end_time if available
}