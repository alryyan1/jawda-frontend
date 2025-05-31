import type { Patient, EditPatientFormData } from './patients';
import type { Doctor } from './doctors';
import type { UserStripped } from './auth';
import type { Service } from './services';
import type { RequestedService } from './visits'; // Or wherever it's defined

export type AuditStatus = 'pending_review' | 'verified' | 'needs_correction' | 'rejected' | 'all';

export interface AuditedPatientRecord {
  id: number;
  patient_id: number;
  doctor_visit_id: number;
  audited_by_user_id?: number | null;
  audited_at?: string | null;
  status: AuditStatus;
  auditor_notes?: string | null;
  original_patient_data_snapshot?: Partial<Patient>; // Key fields

  // Editable fields during audit (mirroring EditPatientFormData but stored here)
  edited_patient_name?: string | null;
  edited_phone?: string | null;
  edited_gender?: 'male' | 'female' | 'other' | null;
  edited_age_year?: number | null;
  edited_age_month?: number | null;
  edited_age_day?: number | null;
  edited_address?: string | null;
  edited_doctor_id?: number | null;
  edited_insurance_no?: string | null;
  edited_expire_date?: string | null; // YYYY-MM-DD
  edited_guarantor?: string | null;
  edited_subcompany_id?: number | null;
  edited_company_relation_id?: number | null;
  
  created_at: string;
  updated_at: string;

  // Relationships loaded from backend
  patient?: Patient; // Original patient data
  doctorVisit?: { id: number; visit_date: string; doctor?: Doctor }; // Basic visit info
  auditor?: UserStripped;
  editedDoctor?: Doctor; // If edited_doctor_id is set
  editedSubcompany?: { id: number; name: string };
  editedCompanyRelation?: { id: number; name: string };
  audited_requested_services?: AuditedRequestedService[];
}

export interface AuditedRequestedService {
  id: number;
  audited_patient_record_id: number;
  original_requested_service_id?: number | null; // Link to original if copied
  service_id: number;
  service?: Service; // Eager loaded

  audited_price: number;
  audited_count: number;
  audited_discount_per?: number | null;
  audited_discount_fixed?: number | null;
  audited_endurance: number; // What the company is expected to cover by the auditor
  audited_status: 'pending_review' | 'approved_for_claim' | 'rejected_by_auditor' | 'pending_edits';
  auditor_notes_for_service?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Form data for an audited service line item
export interface AuditedServiceFormData {
  id?: number | null;
  service_id: string; // From select
  audited_price: string;
  audited_count: string;
  audited_discount_per?: string;
  audited_discount_fixed?: string;
  audited_endurance: string;
  audited_status: AuditedRequestedService['audited_status'];
  auditor_notes_for_service?: string;
}

// API payload for creating/updating audited service
export interface AuditedServiceApiPayload {
    audited_patient_record_id?: number; // For create if not part of URL
    service_id: number;
    audited_price: number;
    audited_count: number;
    audited_discount_per?: number | null;
    audited_discount_fixed?: number | null;
    audited_endurance: number;
    audited_status: AuditedRequestedService['audited_status'];
    auditor_notes_for_service?: string | null;
}