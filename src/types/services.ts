// src/types/services.ts
import type { User } from './auth'; // Assuming User type

export interface ServiceGroup {
  id: number;
  name: string;
}
// src/types/services.ts (or visits.ts)

export interface RequestedService {
  id: number; // ID of the requested_services record itself
  visit_id: number;
  doctorvisits_id: number; // ID of the doctor visit this service belongs to
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

// ... (Existing Service, ServiceGroup, etc.)

export interface SubServiceCost {
  id: number;
  name: string;
  // description?: string; // If you add it
}

export interface ServiceCost {
  id: number;
  name: string;
  service_id: number;
  sub_service_cost_id: number;
  sub_service_cost_name?: string; // From eager loading
  sub_service_cost?: SubServiceCost; // Full object if eager loaded
  cost_type: 'total' | 'after cost';
  percentage: number | null;
  fixed: number | null;
  // created_at, updated_at if your table has them
}

// For the form item within ManageServiceCostsDialog
export interface ServiceCostFormItem {
  id?: number | null; // For existing items
  name: string;
  sub_service_cost_id: string; // string from select
  cost_type: 'total' | 'after cost';
  percentage: string; // string from input
  fixed: string;      // string from input
}

// If the API for create/update ServiceCost expects a different structure
export interface ServiceCostApiPayload {
    name: string;
    sub_service_cost_id: number;
    cost_type: 'total' | 'after cost';
    percentage?: number | null;
    fixed?: number | null;
}
// src/types/services.ts (or a new src/types/costs.ts)
// ... other types like Service, SubServiceCost, ServiceCost ...

export interface RequestedServiceCost {
  id: number;
  requested_service_id: number;
  sub_service_cost_id: number;
  service_cost_id: number; // The ID of the ServiceCost definition rule used
  amount: number; // The actual calculated or overridden cost amount for this instance
  created_at?: string;
  updated_at?: string;

  // Optional: for display or if eager loaded from backend
  sub_service_cost_name?: string; 
  service_cost_definition_name?: string; // Name from the ServiceCost definition
  subServiceCost?: SubServiceCost; // Full object if eager loaded
  serviceCostDefinition?: ServiceCost; // Full object if eager loaded
}

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

// Snapshot of a deleted/voided requested service deposit
export interface RequestedServiceDepositDeletion {
  id: number;
  requested_service_deposit_id: number;
  requested_service_id: number;
  amount: number;
  user_id: number; // user who originally created the deposit
  user?: Pick<User, 'id' | 'name'>;
  is_bank: boolean;
  is_claimed: boolean;
  shift_id: number | null;
  requested_service?: RequestedService;
  deleted_by: number | null;
  deleted_by_user?: Pick<User, 'id' | 'name'> | null;
  original_created_at?: string | null;
  deleted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}