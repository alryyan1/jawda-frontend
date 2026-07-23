// src/types/services.ts
import type { User } from './auth'; // Assuming User type

export interface ServiceGroup {
  id: number;
  name: string;
}
export interface RequestedService {
  id: number; // ID of the requested_services record itself
  visit_id: number;
  doctorvisits_id: number; // ID of the doctor visit this service belongs to
  service_id: number;
  tooth_id?: number | null; // Universal tooth number (1-32) this service applies to, if dental
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
  total_cost?: number;
  user_deposited?: number | null;
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
  has_cost?: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  contract_price?: number | null;
  contract_requires_approval?: boolean;
}

// For Service Form Data
export interface ServiceFormData {
  name: string;
  service_group_id: string | undefined; // From select
  price: string; // Input as string
  activate: boolean;
  variable: boolean;
  has_cost: boolean;
}

export interface ServiceGroupWithServices extends ServiceGroup {
  services: Service[];
}

export interface RequestedServiceDeposit {
  id: number;
  requested_service_id: number;
  amount: number;
  user_id: number;
  user?: Pick<User, 'id' | 'name'>; // Optional loaded user
  is_bank: boolean;
  is_claimed: boolean; // For reconciliation later
  shift_id: number;
  created_at: string;
  requested_service: RequestedService;
}

export   const ServiceFormMode =  { CREATE : 'create', EDIT : 'edit' }
export type ServiceFormMode = typeof ServiceFormMode[keyof typeof ServiceFormMode];
// src/types/services.ts
// ... existing types ...

export interface RequestedServiceDeposit {
  id: number;
  requested_service_id: number;
  amount: number;
  user_id: number; // User who processed this specific deposit
  user?: { id: number; name: string }; // Optional loaded user
  is_bank: boolean;
  is_claimed: boolean; // For reconciliation
  shift_id: number;
  created_at: string;
  updated_at?: string; // If your pivot has timestamps
}

export interface RequestedServiceDepositFormData {
  id?: number; // For updates
  amount: string; // Input as string
  is_bank: boolean;
  // shift_id and user_id will usually be set by the backend or from context
}

export interface RequestedServiceCost {
  id: number;
  requested_service_id: number;
  party_id: number;
  amount: number | null;
  user_id: number;
  party?: { id: number; name: string };
  user?: Pick<User, 'id' | 'name'>;
  created_at: string;
}