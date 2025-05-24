// src/services/reportService.ts
import type { PaginatedResponse } from '@/types/common';
import apiClient from './api';
import type { DoctorShiftFinancialSummary, DoctorShiftReportItem, ServiceStatisticItem } from '@/types/reports';

export interface DoctorShiftReportFilters {
  page?: number;
  per_page?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  doctor_id?: number | string | null;
  status?: string | null; // "0" or "1" or "" for all
  shift_id?: number | string | null; // General clinic shift ID
}
export const downloadDoctorShiftsReportPdf = async (filters: Omit<DoctorShiftReportFilters, 'page' | 'per_page'>): Promise<Blob> => {
  const response = await apiClient.get<Blob>('/reports/doctor-shifts/pdf', {
    params: filters,
    responseType: 'blob', // Important: tell Axios to expect a binary response
  });
  return response.data;
};
export const getDoctorShiftsReport = async (filters: DoctorShiftReportFilters): Promise<PaginatedResponse<DoctorShiftReportItem>> => {
  // The endpoint for this DoctorShiftReportItem is DoctorShiftController@index
  const response = await apiClient.get<PaginatedResponse<DoctorShiftReportItem>>('/doctor-shifts', { params: filters });
  return response.data; // Assuming Laravel pagination structure
};

export const getDoctorShiftFinancialSummary = async (doctorShiftId: number): Promise<DoctorShiftFinancialSummary> => {
  // Backend returns { data: DoctorShiftFinancialSummary }
  const response = await apiClient.get<{ data: DoctorShiftFinancialSummary }>(`/doctor-shifts/${doctorShiftId}/financial-summary`);
  return response.data.data;
};

export interface ServiceStatisticsFilters {
  page?: number;
  per_page?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  service_group_id?: number | string | null;
  search_service_name?: string;
  sort_by?: 'name' | 'request_count';
  sort_direction?: 'asc' | 'desc';
}

export const getServiceStatisticsReport = async (filters: ServiceStatisticsFilters): Promise<PaginatedResponse<ServiceStatisticItem>> => {
  const response = await apiClient.get<PaginatedResponse<ServiceStatisticItem>>('/reports/service-statistics', { params: filters });
  return response.data; // Backend already structures pagination
};

export const downloadLabPriceListPdf = async (filters: { search_service_name?: string } = {}): Promise<Blob> => {
  const response = await apiClient.get('/reports/lab-price-list/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

// src/services/reportService.ts
// ... (existing imports and functions) ...

export interface CompanyContractPdfFilters {
  search?: string; // Matches the 'search' param name in controller if used
  // Add other filters if your PDF generation supports them
}

export const downloadCompanyServiceContractPdf = async (companyId: number, filters: CompanyContractPdfFilters = {}): Promise<Blob> => {
  const response = await apiClient.get(`/reports/company/${companyId}/service-contracts/pdf`, {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export const downloadCompanyTestContractPdf = async (companyId: number, filters: CompanyContractPdfFilters = {}): Promise<Blob> => {
  const response = await apiClient.get(`/reports/company/${companyId}/test-contracts/pdf`, {
    params: filters, // 'search' will map to 'search_service_name' or 'search_test_name' if backend expects that
    responseType: 'blob',
  });
  return response.data;
};