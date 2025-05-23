// src/types/users.ts (or part of src/types/index.ts)
import type { Permission, Role } from './auth';
import type { Doctor } from './doctors'; // Assuming this is defined

// Define Role and Permission if not already in auth.ts
// src/types/auth.ts

// End of auth.ts example parts
// src/types/users.ts (or a new reports.ts or dashboard.ts)
export interface UserShiftIncomeSummary {
  user_id: number;
  user_name: string;
  shift_id: number;
  total_income: number;
  total_cash: number;
  total_bank: number;
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
export const UserFormMode =  { CREATE : 'create', EDIT : 'edit' }
export type UserFormMode = typeof UserFormMode[keyof typeof UserFormMode];