import apiClient from './api';
import type { MainTest, MainTestStripped } from '@/types/labTests';
import type { PaginatedResponse } from '@/types/common';
import { toast } from 'sonner';

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

export const getAllActiveMainTestsForPriceList = async (searchTerm?: string, packageId?: string | number | null): Promise<MainTest[]> => {
  // Backend MainTestController@index should handle returning all if no pagination params are sent
  // and filter by name. Or create a dedicated endpoint.
  const params: Record<string, any> = { available: true }; // Fetch only available tests
  if (searchTerm) params.search = searchTerm;
  if (packageId !== undefined && packageId !== null && packageId !== '' && packageId !== 'all') {
    const parsed = typeof packageId === 'string' ? parseInt(packageId, 10) : packageId;
    if (!isNaN(Number(parsed))) params.pack_id = parsed;
  }
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
  is_special_test?: boolean | null;
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

export const getMainTestsListForSelection = async (
  filters: { 
      pack_id?: number | 'none' | 'all' | null; 
      visit_id_to_exclude_requests?: number; 
      search?: string 
  }
): Promise<MainTestStripped[]> => {
const params: any = { no_pagination: true, available: true, ...filters };
if (filters.pack_id === 'all') delete params.pack_id; // Don't send pack_id if 'all'

const response = await apiClient.get<{ data: MainTestStripped[] }>('/main-tests', { params });
return response.data.data; // Assuming MainTestStrippedResource::collection
};

export const findMainTestByIdentifier = async (identifier: string, visitIdToExclude?:number): Promise<MainTestStripped | null> => {
  try {
      const params: any = {};
      if(visitIdToExclude) params.visit_id = visitIdToExclude;
      const response = await apiClient.get<{ data: MainTestStripped }>(`/main-tests/find/${identifier}`, {params});
      return response.data.data;
  } catch (error: any) {
      if (error.response && (error.response.status === 404 || error.response.status === 409)) {
          toast.warning(error.response.data.message || "Test not found or already requested.");
          return null;
      }
      throw error;
  }
};