// src/services/analysisService.ts
import apiClient from './api';
import type { AnalysisResponse, AnalysisData } from '@/types/analysis';

export interface AnalysisFilters {
  date_from: string; // YYYY-MM-DD
  date_to: string;   // YYYY-MM-DD
}

export const getAnalysisSummaryData = async (filters: AnalysisFilters): Promise<AnalysisData> => {
  const response = await apiClient.get<AnalysisResponse>('/analysis/summary', { params: filters });
  return response.data.data; // Assuming backend wraps in 'data' then another 'data'
};