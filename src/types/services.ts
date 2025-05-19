// src/types/services.ts

export interface ServiceGroup {
  id: number;
  name: string;
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
