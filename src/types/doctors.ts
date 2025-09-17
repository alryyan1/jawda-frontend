// src/types/doctors.ts

import type { User } from "./auth";

export interface Specialist {
  id: number;
  name: string;
}

export interface FinanceAccount {
  id: number;
  name: string;
  // add other fields if needed by UI
}
export interface SpecialistFormData {
  name: string;
}

// Ensure Specialist has doctors_count if you use it
export interface Specialist {
  id: number;
  name: string;
  doctors_count?: number; // From withCount('doctors')
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
  finanace_account_id_insurance: number;
  insurance_finance_account_name?: string;
  calc_insurance: boolean;
  user_id?: number | null;
  username?: string;
  user?: User; // if you embed the whole user object
  created_at: string;
  updated_at: string;
}
// --- NEW/VERIFY: DoctorStripped Interface ---
export interface DoctorStripped {
  id: number;
  name: string;
  specialist_name?: string | null; // Optional: if you often need specialist name with stripped info
  // Add any other absolutely essential fields often needed with just the doctor's ID/Name
  // For example, if doctors have a primary contact or specific code:
  // phone?: string; 
  // code?: string;
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
  finanace_account_id_insurance: string | undefined;
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
// --- NEW/VERIFY: DoctorStripped Interface ---
export interface DoctorStripped {
  id: number;
  name: string;
  specialist_name?: string | null; // Optional: if your DoctorStrippedResource includes this
  // Add other frequently needed minimal fields if any
  // phone?: string; 
}


// If DoctorShift is a new concept
export interface DoctorShift {
  id: number;
  doctor_id: number;
  user_id: number;
  doctor_name: string;
  doctor_specialist_name?: string | null;
  doctor_avatar_url?: string | null; // For avatar
  status: boolean; // Is this DoctorShift record active/open
  start_time?: string | null;
  end_time?: string | null;
  
  // New fields for UI
  is_examining: boolean; // Is the doctor currently with a patient in this shift
  patients_count: number; // Number of patients waiting or with this doctor in this shift
}

// src/types/doctors.ts
// ... (existing Doctor, DoctorStripped, Specialist etc.) ...

// Represents the doctor_services pivot table entry with service details
export interface DoctorService {
  doctor_service_id: number; // The ID from doctor_services table
  doctor_id: number;
  service_id: number;
  service_name: string;
  service_group_name?: string;
  standard_price: number; // Standard price of the service for reference
  percentage: number | null;
  fixed: number | null;
  created_at?: string;
  updated_at?: string;
}

// For the form in ManageDoctorServicesDialog
export interface DoctorServiceFormData {
  service_id: string; // From select
  percentage?: string; // Input as string
  fixed?: string;      // Input as string
}