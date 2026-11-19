// src/services/clinicService.ts
import type { ActivePatientVisit } from '@/types/patients';
import apiClient from './api';
import type { PaginatedResponse } from '@/types/common';
import type { DoctorShift } from '@/types/doctors';

export const getActiveDoctorShifts = async (clinicShiftId?: number): Promise<DoctorShift[]> => {
  const params: Record<string, any> = {};
  if (clinicShiftId) params.clinic_shift_id = clinicShiftId;
  // Assuming the backend returns DoctorShiftResource::collection which wraps in 'data'
  const response = await apiClient.get<{ data: DoctorShift[] }>('/active-doctor-shifts', { params });
  return response.data.data;
};

interface ActivePatientFilters {
    doctor_shift_id?: number | null; // If filtering by doctor's specific session
    doctor_id?: number | null;       // If filtering by doctor directly
    date?: string;                   // YYYY-MM-DD, only used with doctor_id (default: today)
    search?: string;
    from_admission?: boolean;        // All admission-origin patients, regardless of doctor/date
    date_from?: string;               // YYYY-MM-DD, narrows the from_admission scope
    date_to?: string;                 // YYYY-MM-DD, narrows the from_admission scope
}

export const getActiveClinicPatients = async (filters: ActivePatientFilters): Promise<ActivePatientVisit[]> => {
  const response = await apiClient.get<{ data: ActivePatientVisit[] }>('/clinic-active-patients', { params: filters });
  return response.data.data; // Return the array from the data property
};

// Map of 'YYYY-MM-DD' -> patient count, for a doctor's patients across a date range.
// Drives the day-badge calendar in the Doctor Portal's date picker.
export const getDoctorPatientCountsByDay = async (
  doctorId: number,
  dateFrom: string,
  dateTo: string
): Promise<Record<string, number>> => {
  const response = await apiClient.get<{ data: Record<string, number> }>('/clinic-active-patients/counts-by-day', {
    params: { doctor_id: doctorId, date_from: dateFrom, date_to: dateTo },
  });
  return response.data.data;
};