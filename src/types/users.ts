// src/types/users.ts (or part of src/types/index.ts)
import type { Doctor } from './doctors'; // Assuming this is defined

// Define Role and Permission if not already in auth.ts
// src/types/auth.ts
export interface Role {
  id: number;
  name: string;
}
export interface Permission {
  id: number;
  name: string;
}
// End of auth.ts example parts

export interface User {
  id: number;
  name: string;
  username: string;
  // email?: string;
  doctor_id?: number | null;
  doctor?: Doctor; // If you eager load and want to display doctor name
  is_nurse: boolean;
  user_money_collector_type: 'lab' | 'company' | 'clinic' | 'all';
  created_at: string;
  updated_at: string;
  roles?: Role[];
  permissions?: Permission[]; // Direct permissions
  // all_permissions?: Permission[]; // All permissions via roles & direct
}

export interface UserFormData {
  name: string;
  username: string;
  // email?: string;
  password?: string; // Optional on edit
  password_confirmation?: string;
  doctor_id?: string | undefined; // From select
  is_nurse: boolean;
  user_money_collector_type: 'lab' | 'company' | 'clinic' | 'all' | undefined; // For select
  roles?: string[]; // Array of role names
}
