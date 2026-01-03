import type { PaginatedResponse } from './common';
import type { PatientStripped } from './patients';
import type { DoctorStripped } from './doctors';
import type { UserStripped } from './auth';

// Ward Types
export interface Ward {
  id: number;
  name: string;
  description?: string | null;
  status: boolean;
  created_at: string;
  updated_at: string;
  rooms_count?: number;
  rooms?: Room[];
}

export interface WardFormData {
  name: string;
  description?: string | null;
  status: boolean;
}

// Room Types
export interface Room {
  id: number;
  ward_id: number;
  ward?: Ward;
  room_number: string;
  room_type?: 'normal' | 'vip' | null;
  capacity: number;
  status: boolean;
  price_per_day?: number;
  created_at: string;
  updated_at: string;
  beds_count?: number;
  beds?: Bed[];
}

export interface RoomFormData {
  ward_id: string | undefined;
  room_number: string;
  room_type?: string | null;
  capacity: string;
  status: boolean;
}

// Bed Types
export interface Bed {
  id: number;
  room_id: number;
  room?: Room;
  bed_number: string;
  status: 'available' | 'occupied' | 'maintenance';
  is_available?: boolean;
  created_at: string;
  updated_at: string;
  current_admission?: Admission | null;
}

export interface BedFormData {
  room_id: string | undefined;
  bed_number: string;
  status: 'available' | 'occupied' | 'maintenance';
}

// Admission Types
export interface Admission {
  id: number;
  patient_id: number;
  patient?: PatientStripped;
  ward_id: number;
  ward?: Ward;
  room_id: number;
  room?: Room;
  bed_id: number;
  bed?: Bed;
  admission_date: string; // YYYY-MM-DD
  admission_time?: string | null; // HH:mm:ss
  discharge_date?: string | null; // YYYY-MM-DD
  discharge_time?: string | null; // HH:mm:ss
  admission_type?: string | null;
  admission_reason?: string | null;
  diagnosis?: string | null;
  status: 'admitted' | 'discharged' | 'transferred';
  doctor_id?: number | null;
  doctor?: DoctorStripped;
  specialist_doctor_id?: number | null;
  specialist_doctor?: DoctorStripped;
  user_id: number;
  user?: UserStripped;
  notes?: string | null;
  balance?: number;
  days_admitted?: number;
  // New fields
  provisional_diagnosis?: string | null;
  operations?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdmissionFormData {
  patient_id: string | undefined;
  ward_id: string | undefined;
  room_id: string | undefined;
  bed_id: string | undefined;
  admission_date: Date | undefined;
  admission_time?: string | null;
  admission_type?: string | null;
  admission_reason?: string | null;
  diagnosis?: string | null;
  doctor_id?: string | undefined;
  specialist_doctor_id?: string | undefined;
  notes?: string | null;
  provisional_diagnosis?: string | null;
  operations?: string | null;
}

export interface DischargeFormData {
  discharge_date?: Date | undefined;
  discharge_time?: string | null;
  notes?: string | null;
}

export interface TransferFormData {
  ward_id: string | undefined;
  room_id: string | undefined;
  bed_id: string | undefined;
  notes?: string | null;
}

// Admission Requested Service Types
export interface AdmissionRequestedService {
  id: number;
  admission_id: number;
  admission?: Admission;
  service_id: number;
  service?: import('./services').Service;
  user_id: number;
  requesting_user?: UserStripped;
  user_deposited?: number | null;
  deposit_user?: UserStripped;
  doctor_id?: number | null;
  performing_doctor?: DoctorStripped;
  price: number;
  endurance: number;
  discount: number;
  discount_per: number;
  count: number;
  doctor_note?: string | null;
  nurse_note?: string | null;
  done: boolean;
  approval: boolean;
  created_at: string;
  updated_at: string;
  // Calculated fields
  total_price?: number;
  net_payable_by_patient?: number;
  balance?: number;
  costs?: AdmissionRequestedServiceCost[];
  deposits?: AdmissionRequestedServiceDeposit[];
}

export interface AdmissionRequestedServiceCost {
  id: number;
  admission_requested_service_id: number;
  service_cost_id: number;
  service_cost?: import('./services').ServiceCost;
  sub_service_cost_id?: number | null;
  sub_service_cost?: import('./services').SubServiceCost;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface AdmissionRequestedServiceDeposit {
  id: number;
  admission_requested_service_id: number;
  user_id: number;
  user?: UserStripped;
  amount: number;
  is_bank: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Vital Signs Types
export interface AdmissionVitalSign {
  id: number;
  admission_id: number;
  user_id: number;
  user?: UserStripped;
  reading_date: string;
  reading_time: string;
  temperature?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  oxygen_saturation?: number | null; // SpO2
  oxygen_flow?: number | null; // O2
  pulse_rate?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdmissionVitalSignFormData {
  reading_date: string;
  reading_time: string;
  temperature?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  oxygen_saturation?: number | null;
  oxygen_flow?: number | null;
  pulse_rate?: number | null;
  notes?: string | null;
}

export interface AdmissionRequestedServiceFormData {
  service_ids: number[];
  quantities?: { [key: number]: number };
  doctor_id?: number | null;
}

export interface AdmissionRequestedServiceUpdateData {
  price?: number;
  count?: number;
  discount?: number;
  discount_per?: number;
  doctor_id?: number | null;
  doctor_note?: string | null;
  nurse_note?: string | null;
  done?: boolean;
  approval?: boolean;
}

export interface AdmissionServiceDepositFormData {
  amount: number;
  is_bank: boolean;
  notes?: string | null;
}

export interface AdmissionDeposit {
  id: number;
  admission_id: number;
  amount: number;
  is_bank: boolean;
  notes?: string | null;
  user_id: number;
  user?: UserStripped;
  created_at: string;
  updated_at: string;
}

export interface AdmissionDepositFormData {
  amount: number;
  is_bank: boolean;
  notes?: string | null;
}

export interface AdmissionBalance {
  balance: number;
  initial_deposit: number;
  additional_deposits: number;
  total_deposits: number;
  total_paid_from_deposit: number;
}

export interface AdmissionLedgerEntry {
  id: string | number;
  type: 'deposit' | 'service';
  description: string;
  amount: number;
  is_bank: boolean;
  date: string;
  time?: string;
  user?: string;
  notes?: string;
  service_id?: number;
  service_name?: string;
  count?: number;
  balance_after: number;
}

export interface AdmissionTransaction {
  id: number;
  admission_id: number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  reference_type?: 'service' | 'deposit' | 'manual' | null;
  reference_id?: number | null;
  is_bank: boolean;
  notes?: string | null;
  user_id: number;
  user?: UserStripped;
  created_at: string;
  updated_at: string;
}

export interface AdmissionTransactionFormData {
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  reference_type?: 'service' | 'deposit' | 'manual' | null;
  reference_id?: number | null;
  is_bank: boolean;
  notes?: string | null;
}

export interface AdmissionLedgerEntry {
  id: string | number;
  type: 'debit' | 'credit';
  description: string;
  amount: number;
  is_bank: boolean;
  date: string;
  time?: string;
  user?: string;
  notes?: string;
  reference_type?: string;
  reference_id?: number;
  balance_after: number;
}

export interface AdmissionLedger {
  admission_id: number;
  patient: {
    id: number;
    name: string;
  };
  summary: {
    total_credits: number;
    total_debits: number;
    balance: number;
  };
  entries: AdmissionLedgerEntry[];
}

export interface AdmissionServiceCostFormData {
  costs: Array<{
    service_cost_id: number;
    sub_service_cost_id?: number | null;
    amount: number;
  }>;
}

// Admission Requested Lab Test Types
export interface AdmissionRequestedLabTest {
  id: number;
  admission_id: number;
  admission?: Admission;
  main_test_id: number;
  main_test?: import('./labTests').MainTestStripped;
  user_id: number;
  requesting_user?: UserStripped;
  price: number; // From main_test.price
  discount: number;
  discount_per: number;
  doctor_id?: number | null;
  performing_doctor?: DoctorStripped;
  done: boolean;
  approval: boolean;
  created_at: string;
  updated_at: string;
  // Calculated fields
  net_payable_by_patient?: number;
  balance?: number;
}

export interface AdmissionRequestedLabTestFormData {
  main_test_ids: number[];
  doctor_id?: number | null;
}

export interface AdmissionRequestedLabTestUpdateData {
  price?: number;
  discount?: number;
  discount_per?: number;
  doctor_id?: number | null;
}

export type PaginatedWardsResponse = PaginatedResponse<Ward>;
export type PaginatedRoomsResponse = PaginatedResponse<Room>;
export type PaginatedBedsResponse = PaginatedResponse<Bed>;
export type PaginatedAdmissionsResponse = PaginatedResponse<Admission>;

