export interface MedicalAttachment {
  id: number;
  patient_id: number;
  doctor_visit_id: number | null;
  category: 'lab_result' | 'radiology' | 'referral' | 'insurance' | 'prescription' | 'other';
  title: string | null;
  original_filename: string;
  url: string;
  mime_type: string;
  file_size: number;
  note: string | null;
  uploaded_by_user?: { id: number; name: string } | null;
  created_at: string;
}
