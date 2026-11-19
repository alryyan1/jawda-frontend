export interface VisitIntakeOutputRecordedBy {
  id: number;
  name: string;
}

export interface VisitIntakeOutput {
  id: number;
  doctor_visit_id: number;
  patient_id: number;
  recorded_at: string;
  feeding: number;
  iv_fluid: number;
  maintenance: number;
  urine_output: number;
  insensible_loss: number;
  total_intake: number;
  total_output: number;
  balance: number;
  notes: string | null;
  recorded_by: VisitIntakeOutputRecordedBy | null;
}

export interface VisitIntakeOutputInput {
  recorded_at?: string;
  feeding?: number;
  iv_fluid?: number;
  maintenance?: number;
  urine_output?: number;
  insensible_loss?: number;
  notes?: string | null;
}
