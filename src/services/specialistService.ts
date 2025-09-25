import apiClient from './api';
import type { PaginatedResponse } from '@/types/common';
import type { Specialist, SpecialistFormData } from '@/types/doctors';

const API_URL = '/specialists';

export const getSpecialistsPaginated = async (
  page = 1,
  filters: { search?: string; per_page?: number }
): Promise<PaginatedResponse<Specialist>> => {
  const response = await apiClient.get<PaginatedResponse<Specialist>>(API_URL, { params: { page, ...filters } });
  return response.data;
};

export const createSpecialist = async (data: SpecialistFormData): Promise<Specialist> => {
  const response = await apiClient.post<{ data: Specialist }>(API_URL, data);
  return response.data.data;
};

export const updateSpecialist = async (id: number, data: Partial<SpecialistFormData>): Promise<Specialist> => {
  const response = await apiClient.put<{ data: Specialist }>(`${API_URL}/${id}`, data);
  return response.data.data;
};

export const deleteSpecialist = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

export const updateSpecialistFirestoreId = async (id: number, firestoreId: string): Promise<Specialist> => {
  const response = await apiClient.put<{ data: Specialist }>(`${API_URL}/${id}`, { firestore_id: firestoreId });
  return response.data.data;
};