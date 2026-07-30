export interface VisitMedicalReport {
  id: number;
  doctor_visit_id: number;
  user_id: number;
  user?: { id: number; name: string } | null;
  content: string | null;
  complete: boolean;
  completed_at: string | null;
  is_printed: boolean;
  printed_by_user_id: number | null;
  printed_by_user?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}
