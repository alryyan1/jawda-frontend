export interface PdfSetting {
  id: number;
  font_family: string;
  font_size: number;
  logo_path: string | null;
  logo_url: string | null;
  logo_width: number | null;
  logo_height: number | null;
  logo_position: 'left' | 'right' | null;
  hospital_name: string | null;
  header_image_path: string | null;
  header_image_url: string | null;
  footer_phone: string | null;
  footer_address: string | null;
  footer_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface PdfSettingFormData {
  font_family: string;
  font_size: number;
  logo_width?: number | null;
  logo_height?: number | null;
  logo_position?: 'left' | 'right' | null;
  hospital_name?: string | null;
  footer_phone?: string | null;
  footer_address?: string | null;
  footer_email?: string | null;
}

