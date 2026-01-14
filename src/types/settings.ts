// src/types/settings.ts

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
  firestore_result_collection?: string | null;
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
  ultramsg_instance_id?: string | null; // Ultramsg WhatsApp instance
  ultramsg_token?: string | null; // Ultramsg WhatsApp token (handle with care)
  ultramsg_base_url?: string | null; // Ultramsg base URL
  ultramsg_default_country_code?: string | null; // Ultramsg default country code
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
  financial_year_end?: string | null; // YYYY-MM-DD
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
  report_header_company_name?: string | null;
  report_header_address_line1?: string | null;
  report_header_address_line2?: string | null;
  report_header_phone?: string | null;
  report_header_email?: string | null;
  report_header_vatin?: string | null;
  report_header_cr?: string | null;
  default_lab_report_template?: string | null;
  firebase_enabled?: boolean;
  storage_name?: string | null;
  prevent_backdated_entry?: boolean;
  whatsapp_number?: string | null;
  pdf_header_type?: "logo" | "full_width" | "none";
  pdf_header_logo_position?: "left" | "right";
  pdf_header_logo_width?: number;
  pdf_header_logo_height?: number;
  pdf_header_logo_x_offset?: number;
  pdf_header_logo_y_offset?: number;
  pdf_header_image_width?: number;
  pdf_header_image_height?: number;
  pdf_header_image_x_offset?: number;
  pdf_header_image_y_offset?: number;
  pdf_header_title?: string | null;
  pdf_header_subtitle?: string | null;
  pdf_header_title_font_size?: number;
  pdf_header_subtitle_font_size?: number;
  pdf_header_title_y_offset?: number;
  pdf_header_subtitle_y_offset?: number;
}

// For the form, all fields are optional as we are patching
export type SettingsFormData = Partial<Setting>;
