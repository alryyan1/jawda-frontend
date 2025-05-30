import type { User } from './auth';
import type { Shift } from './shifts';

export interface CostCategory {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Cost {
  id: number;
  description: string;
  total_cost_amount: number;
  payment_method: 'cash' | 'bank';
  cost_category_id?: number | null;
  cost_category_name?: string;
  user_cost_id?: number | null;
  user_cost_name?: string;
  shift_id?: number | null;
  shift_name?: string;
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
  payment_method?: string | null;
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