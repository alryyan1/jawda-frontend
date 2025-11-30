// src/services/dashboardService.ts



// src/services/dashboardService.ts
import apiClient from './api';
import type { DashboardSummary } from '../types/dashboard';
import type { FinancialSummary } from '../types/dashboard';

export interface MonthlyPatientData {
  month: number;
  month_name: string;
  patient_count: number;
}

export interface YearlyPatientFrequencyResponse {
  data: MonthlyPatientData[];
  meta: {
    year: number;
    total_unique_patients_yearly: number;
    average_monthly_patients: number;
  };
}

export const getDashboardSummary = async (params: { shift_id?: number | null; date?: string | null }): Promise<DashboardSummary> => {
  const response = await apiClient.get<{ data: DashboardSummary }>('/dashboard/summary', { params });
  return response.data.data; // Assuming backend wraps in 'data'
};

export const getFinancialSummary = async (params: { shift_id?: number | null; date?: string | null; from_date?: string | null; to_date?: string | null }): Promise<FinancialSummary> => {
  const response = await apiClient.get<{ data: FinancialSummary }>('/dashboard/financial-summary', { params });
  return response.data.data;
};

export const getYearlyPatientFrequency = async (year: number): Promise<YearlyPatientFrequencyResponse> => {
  const response = await apiClient.get<YearlyPatientFrequencyResponse>('/reports/yearly-patient-frequency', { 
    params: { year } 
  });
  return response.data;
};