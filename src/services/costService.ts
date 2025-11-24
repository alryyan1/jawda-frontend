// src/services/costService.ts
import apiClient from './api';
import type { Cost, CostFormData, CostCategory, PaginatedCostsResponse } from '@/types/finance';

const API_URL = '/costs';
const CATEGORIES_API_URL = '/cost-categories-list';

export const getCostCategoriesList = async (): Promise<CostCategory[]> => {
  // Backend returns ResourceCollection, assumes 'data' wrapper
  const response = await apiClient.get<{ data: CostCategory[] }>(CATEGORIES_API_URL);
  return response.data.data;
};

export const addCost = async (data: CostFormData): Promise<Cost> => {
  const payload = {
    ...data,
    amount: parseFloat(data.amount),
    is_bank_payment: data.is_bank_payment === "1", // Convert string "0" or "1" to boolean
    cost_category_id: data.cost_category_id ? parseInt(data.cost_category_id) : null,
    doctor_shift_id: data.doctor_shift_id ? parseInt(data.doctor_shift_id) : null,
  };
  // Backend returns CostResource, assumes 'data' wrapper
  const response = await apiClient.post<{ data: Cost }>(API_URL, payload);
  return response.data.data;
};

export interface CostFilters { // Same as ServiceStatisticsFilters
  page?: number; per_page?: number; date_from?: string; date_to?: string;
  cost_category_id?: number | string | null; user_cost_id?: number | string | null;
  shift_id?: number | string | null; payment_method?: 'cash' | 'bank' | 'all' | null;
  search_description?: string; sort_by?: string; sort_direction?: string;
}

export const getCostsReportData = async (filters: CostFilters): Promise<PaginatedCostsResponse> => {
  return apiClient.get<PaginatedCostsResponse>('/costs-report-data', { params: filters }).then(res => res.data);
};
export const downloadCostsReportPdf = async (filters: Omit<CostFilters, 'page' | 'per_page'>): Promise<Blob> => {
  const response = await apiClient.get('/reports/costs/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
export const downloadCostsReportExcel = async (filters: Omit<CostFilters, 'page' | 'per_page'>): Promise<Blob> => {
  const response = await apiClient.get('/reports/costs/excel', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
export const deleteCost = async (costId: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${costId}`);
};