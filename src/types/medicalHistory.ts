export interface PatientMedicalHistory {
  id?: number;
  patient_id: number;

  // Past history
  allergies?: string | null;
  drug_history?: string | null;
  family_history?: string | null;
  social_history?: string | null;
  past_medical_history?: string | null;
  past_surgical_history?: string | null;

  // Present illness
  present_complains_summary?: string | null;
  history_of_present_illness_summary?: string | null;

  // Baseline vitals
  baseline_bp?: string | null;
  baseline_temp?: string | null;
  baseline_weight?: string | null;
  baseline_height?: string | null;
  baseline_heart_rate?: string | null;
  baseline_spo2?: string | null;
  baseline_rbs?: string | null;

  // Systems review
  general_appearance_summary?: string | null;
  skin_summary?: string | null;
  head_neck_summary?: string | null;
  cardiovascular_summary?: string | null;
  respiratory_summary?: string | null;
  gastrointestinal_summary?: string | null;
  genitourinary_summary?: string | null;
  neurological_summary?: string | null;
  musculoskeletal_summary?: string | null;
  endocrine_summary?: string | null;
  peripheral_vascular_summary?: string | null;

  // Chronic findings flags
  chronic_juandice?: boolean | null;
  chronic_pallor?: boolean | null;
  chronic_clubbing?: boolean | null;
  chronic_cyanosis?: boolean | null;
  chronic_edema_feet?: boolean | null;
  chronic_dehydration_tendency?: boolean | null;
  chronic_lymphadenopathy?: boolean | null;
  chronic_peripheral_pulses_issue?: boolean | null;
  chronic_feet_ulcer_history?: boolean | null;

  // Care plan
  overall_care_plan_summary?: string | null;
  general_prescription_notes_summary?: string | null;

  created_at?: string;
  updated_at?: string;
}
