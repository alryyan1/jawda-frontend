// src/types/visits.ts (or where DoctorVisit is defined)
import type { Patient } from './patients';
import type { Doctor, DoctorShift } from './doctors'; // Assuming DoctorShift is here
import type { User } from './auth';
import type { Shift } from './shifts';
import type { RequestedService } from './services';
// import { Vital } from './vitals'; // When you add vitals
// import { ClinicalNote } from './notes'; // When you add notes

export interface DoctorVisit { // This is the detailed visit object
  id: number;
  visit_date: string;
  visit_time?: string | null;
  status: string;
  visit_type?: string | null;
  queue_number?: number | null;
  reason_for_visit?: string | null;
  visit_notes?: string | null;
  is_new: boolean;
  number: number;
  only_lab: boolean;

  patient_id: number;
  patient: Patient; // Full patient object

  doctor_id: number;
  doctor?: Pick<Doctor, 'id' | 'name' | 'specialist_name'>; // Or full Doctor object

  user_id: number;
  created_by_user?: Pick<User, 'id' | 'name' | 'username'>;

  shift_id: number;
  general_shift_details?: Shift;

  doctor_shift_id?: number | null;
  doctor_shift_details?: DoctorShift;

  requested_services?: RequestedService[];
  // vitals?: Vital[];
  // clinical_notes?: ClinicalNote[];

  created_at: string;
  updated_at: string;
}