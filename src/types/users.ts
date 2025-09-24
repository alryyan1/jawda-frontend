// src/types/users.ts (or part of src/types/index.ts)
// Removed unused imports to satisfy linter

export interface UserShiftIncomeSummary {
  user_id: number;
  user_name: string;
  shift_id: number;

  // Aggregated overall totals
  total: number;            // overall income total (services + lab)
  total_cash: number;       // overall cash collected
  total_bank: number;       // overall bank collected

  // Expenses and costs
  total_cash_expenses: number;
  total_bank_expenses: number;
  total_cost: number;

  // Net flows
  net_cash: number;
  net_bank: number;

  // Nested breakdowns
  expenses: {
    total_cash_expenses: number;
    total_bank_expenses: number;
  };
  lab_income: {
    total: number;
    bank: number;
    cash: number;
  };
  service_income: {
    total: number;
    bank: number;
    cash: number;
  };
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

export const UserFormMode = { CREATE: 'create', EDIT: 'edit' } as const;
export type UserFormMode = typeof UserFormMode[keyof typeof UserFormMode];