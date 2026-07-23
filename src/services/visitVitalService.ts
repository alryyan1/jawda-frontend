import apiClient from '@/services/api';
import type { VisitVital, VisitVitalInput } from '@/types/vitals';

export const getVisitVitals = async (visitId: number): Promise<VisitVital[]> => {
  const response = await apiClient.get<{ data: VisitVital[] }>(`/doctor-visits/${visitId}/vitals`);
  return response.data.data;
};

export const recordVisitVital = async (visitId: number, payload: VisitVitalInput): Promise<VisitVital> => {
  const response = await apiClient.post<{ data: VisitVital }>(`/doctor-visits/${visitId}/vitals`, payload);
  return response.data.data;
};

export const getPatientVitalsTrend = async (patientId: number): Promise<VisitVital[]> => {
  const response = await apiClient.get<{ data: VisitVital[] }>(`/patients/${patientId}/vitals-trend`);
  return response.data.data;
};
