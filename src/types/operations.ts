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

  created_at: string;
  updated_at: string;
}

export interface OperationFinanceItem {
  id: number;
  operation_id: number;
  item_type: string; // surgeon, assistant, anesthesia, center_share, consumables, equipment, radiology, accommodation
  category: "staff" | "center";
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
}

export interface ManualFinanceItem {
  item_type: string;
  category: "staff" | "center";
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
