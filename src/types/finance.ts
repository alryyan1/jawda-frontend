// src/types/finance.ts
export interface FinanceAccount {
  id: number;
  name: string;
  code?: string;
  debit: "debit" | "credit";
  created_at: string;
  updated_at: string;
}

// src/types/finances.ts
export interface CostCategory {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
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

// src/types/finances.ts
// ... (CostCategory) ...
export interface Cost {
  id: number;
  shift_id: number;
  shift_name?: string; // If loaded
  user_cost_id?: number | null;
  user_cost_name?: string;
  doctor_shift_id?: number | null;
  doctor_shift_doctor_name?: string;
  description: string;
  comment?: string | null;
  amount: number; // Cash amount
  amount_bankak: number; // Bank amount
  payment_method: 'cash' | 'bank'; // Derived
  total_cost_amount: number; // Derived (amount + amount_bankak)
  cost_category_id?: number | null;
  cost_category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CostFilters {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  cost_category_id?: string | null;
  user_cost_id?: string | null;
  shift_id?: string | null;
  payment_method?: 'cash' | 'bank' | 'all' | null;
  search_description?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface CostsSummary {
  total_cash_paid: number;
  total_bank_paid: number;
  grand_total_paid: number;
}

export interface PaginatedCostsResponse {
  data: Cost[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
    summary?: CostsSummary;
  };
}

// src/types/finance.ts (or finances.ts)

export interface CostCategory {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Cost {
  id: number;
  shift_id: number;
  shift_name?: string; // If loaded from backend via relation
  user_cost_id?: number | null; // ID of the user who recorded the cost
  user_cost_name?: string; // Name of the user
  doctor_shift_id?: number | null;
  doctor_shift_doctor_name?: string; // If loaded via relation
  description: string;
  comment?: string | null;
  amount: number; // Represents the CASH portion of the cost
  amount_bankak: number; // Represents the BANK portion of the cost
  // total_cost_amount is now calculated on the frontend: amount + amount_bankak
  cost_category_id?: number | null;
  cost_category_name?: string; // If loaded
  created_at: string; // ISO String
  updated_at: string; // ISO String
  // payment_method will also be derived on frontend based on amount & amount_bankak
}

export interface CostFormData { // For the AddCostDialog
  shift_id: number;
  cost_category_id?: string | undefined;
  doctor_shift_id?: string | undefined;
  description: string;
  comment?: string;
  // These will be split in the dialog/service before sending to backend
  amount_cash_input?: string; // Cash part from form
  amount_bank_input?: string; // Bank part from form
  // The backend CostController expects 'amount' (for cash) and 'amount_bankak' (for bank)
  // So, CostFormData should reflect what the AddCostDialog form collects,
  // and the service layer or dialog's onSubmit will map these to the backend payload.
}


export interface CostFilters {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  cost_category_id?: string | null;
  user_cost_id?: string | null; // User who recorded cost
  shift_id?: string | null;
  payment_method?: 'cash' | 'bank' | 'mixed' | 'all' | null; // Added 'mixed'
  search_description?: string;
  sort_by?: string; // e.g., 'created_at', 'total_cost' (derived)
  sort_direction?: 'asc' | 'desc';
}

export interface CostsSummary {
  total_cash_paid: number;  // Sum of all 'amount' fields
  total_bank_paid: number;  // Sum of all 'amount_bankak' fields
  grand_total_paid: number; // Sum of (amount + amount_bankak) for all records
}

// PaginatedCostsResponse stays the same, but its 'data' will be Array<Cost>
export interface PaginatedCostsResponse {
  data: Cost[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
    summary?: CostsSummary; // Backend calculates this based on filtered data
  };
}