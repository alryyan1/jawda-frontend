export interface AdmissionSetting {
  id: number;
  morning_start: string;   // HH:mm
  morning_end: string;
  evening_start: string;
  evening_end: string;
  full_day_boundary: string;
  default_period_start: string;
  default_period_end: string;
  updated_at?: string;
}

export interface AdmissionSettingFormData {
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  full_day_boundary: string;
  default_period_start: string;
  default_period_end: string;
}
