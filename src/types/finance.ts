// src/types/finance.ts
export interface FinanceAccount {
  id: number;
  name: string;
  debit: 'debit' | 'credit'; // Based on ENUM
  description?: string | null;
  code: string;
  type?: 'revenue' | 'cost' | null; // Based on ENUM
  created_at: string;
  updated_at: string;
}

// src/types/finances.ts
export interface CostCategory {
  id: number;
  name: string;
}

export interface Cost {
  id?: number;
  shift_id: number;
  user_cost?: number | null; // User ID
  user_cost_name?: string;
  doctor_shift_id?: number | null;
  doctor_shift_doctor_name?: string;
  description: string;
  comment?: string | null;
  amount: number; // Amount paid by cash
  amount_bankak: number; // Amount paid by bank
  payment_method?: 'cash' | 'bank'; // Derived for display
  total_cost_amount?: number; // Derived for display
  cost_category_id?: number | null;
  cost_category_name?: string;
  created_at?: string;
}

export interface CostFormData {
  shift_id: number; // Must be current open shift
  cost_category_id?: string | undefined; // From select
  doctor_shift_id?: string | undefined; // Optional, from select
  description: string;
  comment?: string;
  amount: string; // Input as string
  is_bank_payment: string; // "0" for cash, "1" for bank (from RadioGroup)
}