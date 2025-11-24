import apiClient from './api';
import type { SubSpecialist } from '@/types/doctors';

const API_URL = '/specialists';

export interface SubSpecialistFormData {
  name: string;
}

export const getSubSpecialists = async (specialistId: number): Promise<SubSpecialist[]> => {
  const response = await apiClient.get<{ data: SubSpecialist[] }>(`${API_URL}/${specialistId}/sub-specialists`);
  return response.data.data;
};

export const createSubSpecialist = async (specialistId: number, data: SubSpecialistFormData): Promise<SubSpecialist> => {
  const response = await apiClient.post<{ data: SubSpecialist }>(`${API_URL}/${specialistId}/sub-specialists`, data);
  return response.data.data;
};

export const updateSubSpecialist = async (
  specialistId: number,
  subSpecialistId: number,
  data: Partial<SubSpecialistFormData>
): Promise<SubSpecialist> => {
  const response = await apiClient.put<{ data: SubSpecialist }>(
    `${API_URL}/${specialistId}/sub-specialists/${subSpecialistId}`,
    data
  );
  return response.data.data;
};

export const deleteSubSpecialist = async (specialistId: number, subSpecialistId: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${specialistId}/sub-specialists/${subSpecialistId}`);
};

