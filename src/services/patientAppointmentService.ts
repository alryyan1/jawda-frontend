import apiClient from '@/services/api';
import type { PatientAppointment, CreatePatientAppointmentPayload } from '@/types/appointment';

export const getPatientAppointments = async (patientId: number): Promise<PatientAppointment[]> => {
  const response = await apiClient.get<{ data: PatientAppointment[] }>(`/patients/${patientId}/appointments`);
  return response.data.data;
};

export const createPatientAppointment = async (
  patientId: number,
  payload: CreatePatientAppointmentPayload
): Promise<PatientAppointment> => {
  const response = await apiClient.post<{ data: PatientAppointment }>(`/patients/${patientId}/appointments`, payload);
  return response.data.data;
};

export const resendAppointmentWhatsapp = async (appointmentId: number): Promise<PatientAppointment> => {
  const response = await apiClient.post<{ data: PatientAppointment }>(
    `/patient-appointments/${appointmentId}/resend-whatsapp`
  );
  return response.data.data;
};

export const cancelPatientAppointment = async (appointmentId: number): Promise<PatientAppointment> => {
  const response = await apiClient.put<{ data: PatientAppointment }>(`/patient-appointments/${appointmentId}/cancel`);
  return response.data.data;
};
