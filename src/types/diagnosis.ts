export interface RequestedServiceDiagnosis {
  id: number;
  requested_service_id: number;
  user_id: number;
  user?: { id: number; name: string };
  diagnosis: string | null;
  complete: boolean;
  completed_at: string | null;
  is_printed: boolean;
  printed_by_user_id: number | null;
  printed_by_user?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface RequestedServiceForDiagnosis {
  id: number;
  service_name: string;
  patient_name: string;
  patient_phone: string | null;
  visit_id: number;
  doctor_name: string;
  done: boolean;
  created_at: string;
}

export interface DiagnosisPageData {
  data: RequestedServiceDiagnosis | null;
  requested_service: RequestedServiceForDiagnosis;
}
