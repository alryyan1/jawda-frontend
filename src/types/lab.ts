import type { PatientStripped } from "./patients";
import type { UserStripped } from "./auth";

export interface MainTestStripped {
  id: number;
  main_test_name: string;
  price?: number | string | null;
}

export interface MainTest extends MainTestStripped {
  pack_id?: number | null;
  pageBreak: boolean;
  container_id: number;
  container_name?: string;
  divided: boolean;
  available: boolean;
  childTests?: ChildTest[];
}

export interface ChildTest {
  id: number;
  main_test_id: number;
  child_test_name: string;
  normal_range?: string;
  unit_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Container {
  id: number;
  name: string;
}

export interface RequestedResult {
  id: number;
  lab_request_id: number;
  patient_id: number;
  main_test_id: number;
  child_test_id: number;
  result?: string | null;
  normal_range?: string | null;
  unit_name?: string | null;
  flags?: string | null;
  result_comment?: string | null;
  entered_by_user_id?: number | null;
  entered_at?: string | null;
  authorized_by_user_id?: number | null;
  authorized_at?: string | null;
}

export interface LabRequest {
  id: number;
  main_test_id: number;
  main_test?: MainTest;
  pid: number;
  patient_name?: string;
  patient?: PatientStripped;
  doctor_visit_id?: number | null;

  hidden: boolean;
  is_lab2lab: boolean;
  valid: boolean;
  no_sample: boolean;

  price: number;
  amount_paid: number;
  discount_per: number;
  is_bankak: boolean;
  comment?: string | null;

  user_requested?: number | null;
  requesting_user_name?: string;
  requesting_user?: UserStripped;

  user_deposited?: number | null;
  deposit_user_name?: string;
  deposit_user?: UserStripped;

  approve: boolean;
  endurance: number;
  is_paid: boolean;
  done?: boolean;

  sample_id?: string | null;
  created_at: string;
  updated_at: string;

  results?: RequestedResult[];
}

export interface TestOptionTypeForSelect {
  id: number;
  label: string;
  value: string;
  price: number;
} 