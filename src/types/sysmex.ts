// src/types/sysmex.ts

export interface SysmexResult {
  id: number;
  doctorvisit_id: number;
  wbc?: number;
  rbc?: number;
  hgb?: number;
  hct?: number;
  mcv?: number;
  mch?: number;
  mchc?: number;
  plt?: number;
  lym_p?: number;
  mxd_p?: number;
  neut_p?: number;
  lym_c?: number;
  mxd_c?: number;
  neut_c?: number;
  rdw_sd?: number;
  rdw_cv?: number;
  pdw?: number;
  mpv?: number;
  plcr?: number;
}

export interface SysmexResultEventData {
  sysmexResult: SysmexResult;
  doctorVisit: {
    id: number;
    patient_id: number;
    shift_id?: number;
    created_at: string;
  };
  patient: {
    id: number;
    name: string;
    phone?: string;
    result_is_locked?: boolean;
  };
}
