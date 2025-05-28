// src/services/dashboardService.ts



// src/services/dashboardService.ts
import apiClient from './api';
import type { DashboardSummary } from '../types/dashboard';

export const getDashboardSummary = async (params: { shift_id?: number | null; date?: string | null }): Promise<DashboardSummary> => {
  const response = await apiClient.get<{ data: DashboardSummary }>('/dashboard/summary', { params });
  return response.data.data; // Assuming backend wraps in 'data'
};