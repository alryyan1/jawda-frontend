// src/services/doctorShiftService.ts
import apiClient from './api';
import type { DoctorShift } from '../types/doctors'; // Your DoctorShift type from backend
import type { DoctorShiftFinancialSummary } from '@/types/reports';
import type { PaginatedResponse } from '@/types/common';
import type { DoctorShiftReportItem } from '@/types/reports';
// Type for the list from getDoctorsWithShiftStatus
interface DoctorWithShiftStatus {
  id: number; // Doctor ID
  name: string;
  specialist_name?: string | null;
  is_on_shift: boolean;
  current_doctor_shift_id?: number | null;
}

interface StartShiftPayload {
    doctor_id: number;
    shift_id: number; // General clinic shift ID
    // start_time?: string; // Optional
}
interface EndShiftPayload {
    doctor_shift_id: number; // The ID of the DoctorShift record to close
    // end_time?: string; // Optional
}
// NEW FUNCTION TO ADD:
/**
 * Updates the proofing/verification flags on a DoctorShift record.
 */
export const updateDoctorShiftProofingFlags = async (
  doctorShiftId: number,
  flags: Partial<Pick<DoctorShift, 
    'is_cash_revenue_prooved' | 
    'is_cash_reclaim_prooved' | 
    'is_company_revenue_prooved' | 
    'is_company_reclaim_prooved'
  >>
): Promise<DoctorShift> => { // Assuming the backend returns the updated DoctorShift resource
  const response = await apiClient.put<{ data: DoctorShift }>(
    `/doctor-shifts/${doctorShiftId}/update-proofing-flags`, 
    flags
  );
  return response.data.data;
};

// --- Functions previously in reportService.ts that might better fit here or a combined service ---
// These are used by DoctorShiftFinancialReviewDialog to get the list of shifts for review
// and their individual financial summaries.

export interface DoctorShiftReportFilters {
  page?: number;
  per_page?: number;
  date_from?: string;
  date_to?: string;
  doctor_id?: number | string | null; // For filtering by doctor
  doctor_name_search?: string;      // NEW, if backend supports searching DoctorShift by doctor name
  status?: string | null;           // '0' or '1' or 'all' for DoctorShift status
  shift_id?: number | string | null;// General clinic shift ID
  user_id_opened?: number | string | null; // User who opened the DoctorShift
}

// This function fetches DoctorShiftReportItem which is a summary.
// Consider if DoctorShiftFinancialReviewDialog needs full DoctorShift models or if ReportItem + FinancialSummary is enough.
export const getDoctorShiftsForReview = async (filters: DoctorShiftReportFilters): Promise<PaginatedResponse<DoctorShiftReportItem>> => {
const response = await apiClient.get<PaginatedResponse<DoctorShiftReportItem>>('/doctor-shifts', { params: filters });
return response.data;
};

export const getDoctorShiftFinancialSummary = async (doctorShiftId: number): Promise<DoctorShiftFinancialSummary> => {
const response = await apiClient.get<{ data: DoctorShiftFinancialSummary }>(`/doctor-shifts/${doctorShiftId}/financial-summary`);
return response.data.data;
};



export const getDoctorsWithShiftStatus = async (filters: { search?: string }): Promise<DoctorWithShiftStatus[]> => {
  const response = await apiClient.get<DoctorWithShiftStatus[]>('/doctors-with-shift-status', { params: filters });
  return response.data; // Assuming backend returns array directly
};

export const startDoctorShift = async (payload: StartShiftPayload): Promise<DoctorShift> => {
  const response = await apiClient.post<{ data: DoctorShift }>('/doctor-shifts/start', payload);
  return response.data.data; // Assuming DoctorShiftResource wraps in 'data'
};

export const endDoctorShift = async (payload: EndShiftPayload): Promise<DoctorShift> => {
  // The route was PUT /doctor-shifts/{doctorShift}/end
  // So we pass doctor_shift_id in URL, not payload usually
  const response = await apiClient.put<{ data: DoctorShift }>(`/doctor-shifts/${payload.doctor_shift_id}/end`, { 
    // end_time: payload.end_time // if you pass it
  });
  return response.data.data;
};