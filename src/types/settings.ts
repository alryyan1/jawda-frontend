// src/types/settings.ts
import type { FinanceAccount } from './finance'; // Assuming FinanceAccount type

export interface Setting {
  id?: number; // Likely always 1
  is_header: boolean;
  is_footer: boolean;
  is_logo: boolean;
  header_base64?: string | null;
  footer_base64?: string | null;
  logo_base64?: string | null; // For display
  header_content?: string | null;
  footer_content?: string | null;
  lab_name?: string | null;
  hospital_name?: string | null;
  print_direct: boolean;
  inventory_notification_number?: string | null;
  disable_doctor_service_check: boolean;
  currency: string;
  phone: string;
  gov: boolean | number | null; // Depends on your implementation
  country: boolean | number | null; // Depends on your implementation
  barcode: boolean;
  show_water_mark: boolean;
  vatin?: string | null;
  cr?: string | null;
  email: string;
  address?: string | null;
  instance_id?: string | null; // WhatsApp instance
  token?: string | null;       // WhatsApp token (handle with care)
  send_result_after_auth: boolean;
  send_result_after_result: boolean;
  edit_result_after_auth: boolean;
  auditor_stamp?: string | null; // base64 or path
  manager_stamp?: string | null; // base64 or path
  finance_account_id?: number | null;
  bank_id?: number | null;
  company_account_id?: number | null;
  endurance_account_id?: number | null;
  main_cash?: number | null;
  main_bank?: number | null;
  financial_year_start?: string | null; // YYYY-MM-DD
  financial_year_end?: string | null;   // YYYY-MM-DD
  pharmacy_bank?: number | null;
  pharmacy_cash?: number | null;
  pharmacy_income?: number | null;
  welcome_message?: string | null;
  send_welcome_message: boolean;
  updated_at?: string;

  // For form handling with file inputs
  logo_file?: File | null;
  header_image_file?: File | null;
  footer_image_file?: File | null;
  auditor_stamp_file?: File | null;
  manager_stamp_file?: File | null;

  // For clearing existing images/base64
  clear_logo_base64?: boolean;
  clear_header_base64?: boolean;
  clear_footer_base64?: boolean;
  clear_auditor_stamp?: boolean;
  clear_manager_stamp?: boolean;
}

// For the form, all fields are optional as we are patching
export type SettingsFormData = Partial<Setting>;