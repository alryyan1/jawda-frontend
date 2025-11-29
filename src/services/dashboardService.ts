// src/services/dashboardService.ts



// src/services/dashboardService.ts
import apiClient from './api';
import type { DashboardSummary } from '../types/dashboard';
import type { FinancialSummary } from '../types/dashboard';

export const getDashboardSummary = async (params: { shift_id?: number | null; date?: string | null }): Promise<DashboardSummary> => {
  const response = await apiClient.get<{ data: DashboardSummary }>('/dashboard/summary', { params });
  return response.data.data; // Assuming backend wraps in 'data'
};

export const getFinancialSummary = async (params: { shift_id?: number | null; date?: string | null; from_date?: string | null; to_date?: string | null }): Promise<FinancialSummary> => {
  const response = await apiClient.get<{ data: FinancialSummary }>('/dashboard/financial-summary', { params });
  return response.data.data;
};