import apiClient from './api';
import type { MainTest } from '@/types/labTests';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/main-tests';

export interface MainTestFilters {
  search?: string;
  available?: boolean;
  container_id?: number;
}

export const getMainTests = (page = 1, filters: MainTestFilters = {}): Promise<PaginatedResponse<MainTest>> => {
  return apiClient.get(API_URL, { params: { page, ...filters } }).then(res => res.data);
};

export const getMainTestById = (id: number): Promise<{ data: MainTest }> => {
  return apiClient.get<{ data: MainTest }>(`${API_URL}/${id}`).then(res => res.data);
};

export interface MainTestFormData {
  main_test_name: string;
  container_id?: number | null;
  price?: string | null;
  available?: boolean;
  description?: string | null;
}

export const createMainTest = (data: MainTestFormData): Promise<{ data: MainTest }> => {
  const payload = {
    ...data,
    price: data.price ? parseFloat(data.price) : null,
  };
  return apiClient.post<{ data: MainTest }>(API_URL, payload).then(res => res.data);
};

export const updateMainTest = (id: number, data: Partial<MainTestFormData>): Promise<{ data: MainTest }> => {
  const payload = {
    ...data,
    price: data.price ? parseFloat(data.price) : null,
  };
  return apiClient.put<{ data: MainTest }>(`${API_URL}/${id}`, payload).then(res => res.data);
};

export const deleteMainTest = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
}; 