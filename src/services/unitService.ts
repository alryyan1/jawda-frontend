import apiClient from './api';
import type { Unit } from '@/types/labTests';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/units';

export const getUnits = (page = 1, filters: Record<string, unknown> = {}): Promise<PaginatedResponse<Unit>> => {
  return apiClient.get(API_URL, { params: { page, ...filters } }).then(res => res.data);
};

export const getUnitById = (id: number): Promise<{ data: Unit }> => {
  return apiClient.get<{ data: Unit }>(`${API_URL}/${id}`).then(res => res.data);
};

export interface CreateUnitData {
  name: string;
}

export const createUnit = (data: CreateUnitData): Promise<Unit> => {
  return apiClient.post<{ data: Unit }>(API_URL, data).then(res => res.data.data);
};

export const updateUnit = (id: number, data: Partial<CreateUnitData>): Promise<Unit> => {
  return apiClient.put<{ data: Unit }>(`${API_URL}/${id}`, data).then(res => res.data.data);
};

export const deleteUnit = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};