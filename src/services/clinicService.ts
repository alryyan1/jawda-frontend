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
    search?: string;
    clinic_shift_id?: number | null; // General clinic shift
    page?: number;
}

export const getActiveClinicPatients = async (filters: ActivePatientFilters): Promise<PaginatedResponse<ActivePatientVisit>> => {
  const response = await apiClient.get<PaginatedResponse<ActivePatientVisit>>('/clinic-active-patients', { params: filters });
  return response.data; // Assuming Laravel pagination structure
};