export interface VisitVital {
  id: number;
  doctor_visit_id: number;
  patient_id: number;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  pain_scale: number | null;
  spo2: number | null;
  weight: number | null;
  height: number | null;
  rbs: number | null;
  recorded_at: string;
}

export interface VisitVitalInput {
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  temperature?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  pain_scale?: number | null;
  spo2?: number | null;
  weight?: number | null;
  height?: number | null;
  rbs?: number | null;
}
