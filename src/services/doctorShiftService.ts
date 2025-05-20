// src/services/doctorShiftService.ts
import apiClient from './api';
import type { DoctorShift } from '../types/doctors'; // Your DoctorShift type from backend
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