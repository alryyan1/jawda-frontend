export interface PatientAppointment {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  doctor?: { id: number; name: string } | null;
  created_by_user_id: number | null;
  created_by?: { id: number; name: string } | null;
  scheduled_at: string;
  notes: string | null;
  status: 'scheduled' | 'cancelled' | string;
  whatsapp_sent_at: string | null;
  whatsapp_send_error: string | null;
  created_at: string;
}

export interface CreatePatientAppointmentPayload {
  doctor_id?: number | null;
  scheduled_at: string;
  notes?: string | null;
  send_whatsapp?: boolean;
}
