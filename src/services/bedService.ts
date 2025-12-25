import apiClient from './api';
import type { Bed, BedFormData, PaginatedBedsResponse } from '../types/admissions';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/beds';

export const getBeds = async (page = 1, filters: Record<string, string | number | boolean> = {}): Promise<PaginatedBedsResponse> => {
  const response = await apiClient.get<PaginatedBedsResponse>(API_URL, { 
    params: { page, ...filters } 
  });
  return response.data;
};

export const getBedById = async (id: number): Promise<{ data: Bed }> => {
  const response = await apiClient.get<{ data: Bed }>(`${API_URL}/${id}`);
  return response.data;
};

export const createBed = async (data: BedFormData): Promise<{ data: Bed }> => {
  const payload = {
    ...data,
    room_id: parseInt(String(data.room_id)),
  };
  const response = await apiClient.post<{ data: Bed }>(API_URL, payload);
  return response.data;
};

export const updateBed = async (id: number, data: Partial<BedFormData>): Promise<{ data: Bed }> => {
  const payload: Record<string, any> = { ...data };
  if (data.room_id !== undefined) payload.room_id = parseInt(String(data.room_id));
  
  const response = await apiClient.put<{ data: Bed }>(`${API_URL}/${id}`, payload);
  return response.data;
};

export const deleteBed = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

export const getAvailableBeds = async (filters: { ward_id?: number; room_id?: number } = {}): Promise<Bed[]> => {
  const response = await apiClient.get<{ data: Bed[] }>(`${API_URL}/available`, { params: filters });
  return response.data.data;
};

