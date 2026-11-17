export type VisitDoseStatus = 'given' | 'not_given' | 'postponed';

export interface VisitDoseAdministeredBy {
  id: number;
  name: string;
}

export interface VisitDose {
  id: number;
  doctor_visit_id: number;
  patient_id: number;
  medication_name: string;
  dosage: string;
  status: VisitDoseStatus;
  administered_at: string;
  notes: string | null;
  administered_by: VisitDoseAdministeredBy | null;
}

export interface VisitDoseInput {
  medication_name: string;
  dosage: string;
  status: VisitDoseStatus;
  administered_at?: string;
  notes?: string | null;
}

export interface CompanionContact {
  name: string | null;
  phone: string | null;
}

export interface SendWhatsAppResult {
  success: boolean;
  error?: string;
  message_id?: string;
}
