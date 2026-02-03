// Operation Types
export interface Operation {
  id: number;
  admission_id: number | null;
  admission?: {
    id: number;
    patient: {
      id: number;
      name: string;
      phone: string;
    } | null;
  };
  operation_date: string;
  operation_time: string | null;
  operation_type: string;
  description: string | null;

  // Financial data
  surgeon_fee: number;
  total_staff: number;
  total_center: number;
  total_amount: number;

  // Payments
  cash_paid: number;
  bank_paid: number;
  balance: number;
  bank_receipt_image: string | null;

  notes: string | null;
  status: "pending" | "completed" | "cancelled";

  user_id: number;
  user?: {
    id: number;
    username: string;
  };

  finance_items?: OperationFinanceItem[];
  costs?: OperationCost[];

  created_at: string;
  updated_at: string;
}

export interface OperationFinanceItem {
  id: number;
  operation_id: number;
  operation_item_id?: number | null;
  operation_item?: OperationItem;
  // item_type and category are removed from DB but we might need to support legacy props or derive them
  // Let's keep them as optional for migration safety or derive logic in component
  item_type?: string;
  category?: "staff" | "center";
  description: string | null;
  amount: number;
  is_auto_calculated: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOperationData {
  admission_id?: number | null;
  operation_date: string;
  operation_time?: string | null;
  operation_type: string;
  description?: string | null;
  surgeon_fee: number;
  cash_paid?: number;
  bank_paid?: number;
  bank_receipt_image?: File | null;
  notes?: string | null;
  manual_items?: ManualFinanceItem[];
  costs?: {
    operation_item_id: number;
    perc: number | null;
    fixed: number | null;
  }[];
}

export interface UpdateOperationData {
  operation_date?: string;
  operation_time?: string | null;
  operation_type?: string;
  description?: string | null;
  surgeon_fee?: number;
  cash_paid?: number;
  bank_paid?: number;
  bank_receipt_image?: File | null;
  notes?: string | null;
  status?: "pending" | "completed" | "cancelled";
  manual_items?: ManualFinanceItem[];
  costs?: {
    operation_item_id: number;
    perc: number | null;
    fixed: number | null;
  }[];
  skip_auto_calculations?: boolean;
}

export interface ManualFinanceItem {
  operation_item_id?: number | null;
  item_type?: string; // Legacy/Fallback
  category?: "staff" | "center"; // Legacy/Fallback
  description?: string | null;
  amount: number;
}

export interface OperationFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  admission_id?: number;
  per_page?: number;
}

export interface FinancialReport {
  operations_count: number;
  total_staff: number;
  total_center: number;
  total_amount: number;
  total_cash_paid: number;
  total_bank_paid: number;
  total_balance: number;
  operations: Operation[];
}

// Medical Operation Configuration Types
export interface MedicalOperation {
  id: number;
  name: string;
  code: string | null;
  price: number;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicalOperationData {
  name: string;
  code?: string | null;
  price: number;
  status?: boolean;
}

export interface UpdateMedicalOperationData {
  code?: string | null;
  price?: number;
  status?: boolean;
}

export interface OperationItem {
  id: number;
  name: string;
  type: "center" | "staff";
  is_active: boolean;
}

export interface OperationCost {
  id?: number;
  operation_item_id: number;
  perc?: number | null;
  fixed?: number | null;
  is_surgeon?: boolean;
  operation_item?: OperationItem;
}

export interface OperationTemplate {
  id: number;
  operation_type: string;
  description: string;
  surgeon_fee: number;
  status: string;
  costs?: OperationCost[];
}

// Reuse Operation as Template, but maybe strict subset?
// For now, Operation matches structure.
// Just ensuring 'costs' is compatible in Operation interface above.
