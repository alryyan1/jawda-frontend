import apiClient from './api';
import type { Ward, WardFormData, PaginatedWardsResponse } from '../types/admissions';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/wards';

export const getWards = async (page = 1, filters: Record<string, string | number | boolean> = {}): Promise<PaginatedWardsResponse> => {
  const response = await apiClient.get<PaginatedWardsResponse>(API_URL, { 
    params: { page, ...filters } 
  });
  return response.data;
};

export const getWardById = async (id: number): Promise<{ data: Ward }> => {
  const response = await apiClient.get<{ data: Ward }>(`${API_URL}/${id}`);
  return response.data;
};

export const createWard = async (data: WardFormData): Promise<{ data: Ward }> => {
  const response = await apiClient.post<{ data: Ward }>(API_URL, data);
  return response.data;
};

export const updateWard = async (id: number, data: Partial<WardFormData>): Promise<{ data: Ward }> => {
  const response = await apiClient.put<{ data: Ward }>(`${API_URL}/${id}`, data);
  return response.data;
};

export const deleteWard = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

export const getWardsList = async (filters: { status?: boolean } = {}): Promise<Ward[]> => {
  const response = await apiClient.get<{ data: Ward[] }>('/wards-list', { params: filters });
  return response.data.data;
};

export const getWardRooms = async (wardId: number): Promise<{ data: any[] }> => {
  const response = await apiClient.get<{ data: any[] }>(`${API_URL}/${wardId}/rooms`);
  return response.data;
};

