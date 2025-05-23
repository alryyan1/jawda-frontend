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
// src/services/mainTestService.ts
// ... (getMainTests, etc.)

export const getAllActiveMainTestsForPriceList = async (searchTerm?: string): Promise<MainTest[]> => {
  // Backend MainTestController@index should handle returning all if no pagination params are sent
  // and filter by name. Or create a dedicated endpoint.
  const params: Record<string, any> = { available: true }; // Fetch only available tests
  if (searchTerm) params.search = searchTerm;
  // This might fetch paginated data. If you need ALL, backend needs to support no pagination.
  // For now, assume it can return many if per_page is high.
  params.per_page = 1000; // Fetch a large number, or implement proper "all" fetch
  const response = await apiClient.get('/main-tests', { params });
  return response.data.data; // Assuming pagination structure
};

export const batchUpdateTestPrices = async (updates: Array<{ id: number; price: number }>): Promise<{ message: string }> => {
  const response = await apiClient.put<{ message: string }>('batch-update-prices', { updates });
  return response.data;
};

export const batchDeleteMainTests = async (ids: number[]): Promise<{ message: string; deleted_count: number; errors: string[] }> => {
  const response = await apiClient.post<{ message: string; deleted_count: number; errors: string[] }>('/main-tests/batch-delete', { ids });
  return response.data;
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