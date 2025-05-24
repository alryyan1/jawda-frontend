import type { Doctor } from "./doctors";

// src/types/auth.ts (or src/types/roles.ts)
export interface Permission {
  id: number;
  name: string;
  // guard_name?: string; // if needed on frontend
}

export interface Role {
  id: number;
  name: string;
  guard_name?: string;
  permissions?: Permission[]; // Array of assigned permissions
  created_at?: string;
  updated_at?: string;
}

export interface RoleFormData {
  name: string;
  permissions?: string[]; // Array of permission names
}

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
// --- NEW/VERIFY: UserStripped Interface ---
export interface UserStripped {
  id: number;
  name: string;
  username?: string; // Username is often a good identifier to show
  // avatar_url?: string; // If users have avatars
}