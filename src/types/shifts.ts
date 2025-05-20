// src/types/shifts.ts
export interface Shift {
  id: number;
  name?: string; // If you add a name field
  total: number | string;
  bank: number | string;
  expenses: number | string;
  net_cash?: number | string; // From accessor
  touched: boolean;
  is_closed: boolean;
  closed_at?: string | null;
  pharmacy_entry?: boolean | null;
  created_at: string;
  updated_at: string;
  // opened_by_user_name?: string;
  // closed_by_user_name?: string;
}