// src/types/services.ts
import type { Service } from './services'; // Existing Service type
import type { User } from './auth'; // Assuming User type

export interface ServiceGroup {
  id: number;
  name: string;
}
// src/types/services.ts (or visits.ts)

export interface RequestedService {
  id: number; // ID of the requested_services record itself
  visit_id: number;
  service_id: number;
  service?: Service; // Eager-loaded service details
  user_id: number;
  user_name?: string;
  user_deposited_id?: number | null;
  user_deposited_name?: string | null;
  doctor_id: number;
  doctor_name?: string;
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
}
export interface Service {
  id: number;
  name: string;
  service_group_id: number;
  service_group?: ServiceGroup; // For displaying name
  service_group_name?: string; // If API sends it directly
  price: number | string; // Can be string from form, number from API
  activate: boolean;
  variable: boolean;
  created_at: string;
  updated_at: string;
}

// For Service Form Data
export interface ServiceFormData {
  name: string;
  service_group_id: string | undefined; // From select
  price: string; // Input as string
  activate: boolean;
  variable: boolean;
}
export   const ServiceFormMode =  { CREATE : 'create', EDIT : 'edit' }
export type ServiceFormMode = typeof ServiceFormMode[keyof typeof ServiceFormMode];
