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

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  doctor_id?: number;
  is_nurse: boolean;
  is_supervisor?: boolean;
  is_active?: boolean;
  user_money_collector_type?: "lab" | "company" | "clinic" | "all";
  roles?: Role[];
  created_at?: string;
  updated_at?: string;
}

export interface UserFormData {
  name: string;
  username: string;
  password?: string;
  password_confirmation?: string;
  doctor_id?: string | number;
  is_nurse: boolean;
  is_supervisor?: boolean;
  is_active?: boolean;
  user_money_collector_type?: "lab" | "company" | "clinic" | "all";
  roles: string[];
}

export interface PaginatedUsersResponse {
  data: User[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links?: {
      prev?: string | null;
      next?: string | null;
    };
  };
}

export enum UserFormMode {
  CREATE = 'create',
  EDIT = 'edit'
}