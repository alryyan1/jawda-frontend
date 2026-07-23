export interface VisitPrescriptionItem {
  id: number;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
  instructions: string | null;
  sort_order: number;
}

export interface VisitPrescription {
  id: number;
  doctor_visit_id: number;
  user_id: number;
  user?: { id: number; name: string } | null;
  notes: string | null;
  is_printed: boolean;
  printed_at: string | null;
  items: VisitPrescriptionItem[];
  created_at: string;
  updated_at: string;
}

export interface VisitPrescriptionItemInput {
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
}
