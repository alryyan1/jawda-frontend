import type { User } from "./auth";

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
    // For who opened/closed
    user_id?: number; // ID of user who opened (if 'user_id' field on Shift model means this)
    user_opened?: User | null; 
    user_id_closed?: number | null;
    user_closed?: User | null;
    
}
export interface ShiftFinancialSummary {
  shift_id: number;
  is_closed: boolean;
  closed_at?: string | null;
  total_net_income: number;
  total_discount_applied: number; // Or total_discounts_given
  total_cash_collected: number;
  total_bank_collected: number;
  total_collected: number;
  recorded_expenses: number;
  expected_cash_in_drawer: number;
  shift_total_recorded?: number; // From manual entry on shift close
  shift_bank_recorded?: number;  // From manual entry on shift close
}