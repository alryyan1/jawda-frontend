// src/services/reportService.ts
import type { PaginatedResponse } from '@/types/common';
import apiClient from './api';
import type { DoctorShiftFinancialSummary, DoctorShiftReportItem, MonthlyServiceIncomeReportResponse, ServiceStatisticItem, YearlyPatientFrequencyReportResponse, MonthlyLabIncomeReportResponse } from '@/types/reports';

export interface DoctorShiftReportFilters {
  page?: number;
  per_page?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  doctor_id?: number | string | null;
  status?: string | null; // "0" or "1" or "" for all
  shift_id?: number | string | null; // General clinic shift ID
  user_id_opened?: number | string | null; // User who opened the DoctorShift
  doctor_name_search?: string; // Search by doctor name
}
export const downloadDoctorShiftsReportPdf = async (filters: Omit<DoctorShiftReportFilters, 'page' | 'per_page'>): Promise<Blob> => {
  const response = await apiClient.get<Blob>('/reports/doctor-shifts/pdf', {
    params: filters,
    responseType: 'blob', // Important: tell Axios to expect a binary response
  });
  return response.data;
};
export const downloadDoctorShiftFinancialSummaryPdf = async (doctorShiftId: number): Promise<Blob> => {
  const response = await apiClient.get(`/reports/doctor-shifts/${doctorShiftId}/financial-summary/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};
export interface ClinicReportPdfFilters {
  shift: number; // Shift ID is required
  user?: number | string | null; // User ID is optional
}

export const downloadClinicShiftSummaryPdf = async (filters: ClinicReportPdfFilters): Promise<Blob> => {
  // The route for allclinicsReportNew was not explicitly defined previously, let's assume it's:
  // GET /api/reports/clinic-shift-summary/pdf (or the one you set for `allclinicsReportNew`)
  // The backend method expects 'shift' and 'user' as query parameters.
  const response = await apiClient.get('/reports/clinic-shift-summary/pdf', { // ADJUST URL TO MATCH YOUR ROUTE
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
export const getDoctorShiftsReport = async (filters: DoctorShiftReportFilters): Promise<PaginatedResponse<DoctorShiftReportItem>> => {
  // The endpoint for this DoctorShiftReportItem is DoctorShiftController@index
  const response = await apiClient.get<PaginatedResponse<DoctorShiftReportItem>>('/doctor-shifts', { params: filters });
  return response.data; // Assuming Laravel pagination structure
};
// src/services/reportService.ts
// ... (existing functions) ...
export interface MonthlyLabIncomeFilters {
  month: number;
  year: number;
}
export const downloadMonthlyLabIncomePdf = async (filters: MonthlyLabIncomeFilters): Promise<Blob> => {
  const response = await apiClient.get('/reports/monthly-lab-income/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export const getDoctorShiftFinancialSummary = async (doctorShiftId: number): Promise<DoctorShiftFinancialSummary> => {
  // Backend returns { data: DoctorShiftFinancialSummary }
  const response = await apiClient.get<{ data: DoctorShiftFinancialSummary }>(`/doctor-shifts/${doctorShiftId}/financial-summary`);
  return response.data.data;
};
export const downloadThermalReceiptPdf = async (visitId: number): Promise<Blob> => {
  const response = await apiClient.get(`/visits/${visitId}/thermal-receipt/pdf`, {
    responseType: 'blob',
  });
  return response.data;
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
export interface MonthlyServiceIncomeFilters {
  month: number; // 1-12
  year: number;  // e.g., 2023
  // user_id?: number; // Optional filter by user
}

export const getMonthlyServiceDepositsIncome = async (
  filters: MonthlyServiceIncomeFilters
): Promise<MonthlyServiceIncomeReportResponse> => {
  const response = await apiClient.get<MonthlyServiceIncomeReportResponse>(
    '/reports/monthly-service-deposits-income', 
    { params: filters }
  );
  return response.data; // Assuming backend directly returns the structure
};

// src/services/reportService.ts
// ... (existing imports and functions) ...

export interface DoctorReclaimsPdfFilters {
  date_from: string;
  date_to: string;
  user_id_opened?: string | null; // User who managed/opened the DoctorShift
  doctor_name_search?: string;
  // status?: 'open' | 'closed' | 'all'; // Add if needed for this specific report
}

export const downloadDoctorReclaimsPdf = async (filters: DoctorReclaimsPdfFilters): Promise<Blob> => {
  const response = await apiClient.get<Blob>('/reports/doctor-reclaims/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
// src/services/reportService.ts
// ... (existing imports and functions) ...
import type { ServiceCostBreakdownReportResponse } from '@/types/reports'; // Adjust path

export interface ServiceCostBreakdownFilters {
  date_from: string;
  date_to: string;
  sub_service_cost_id?: string | null;
  service_id?: string | null;
  doctor_id?: string | null;
}

export const getServiceCostBreakdownReport = async (
  filters: ServiceCostBreakdownFilters
): Promise<ServiceCostBreakdownReportResponse> => {
  const response = await apiClient.get<ServiceCostBreakdownReportResponse>(
    '/reports/service-cost-breakdown', 
    { params: filters }
  );
  return response.data; 
};

export const downloadServiceCostBreakdownPdf = async (filters: ServiceCostBreakdownFilters): Promise<Blob> => {
  const response = await apiClient.get<Blob>('/reports/service-cost-breakdown/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

// src/services/reportService.ts
// ... (existing imports and functions) ...
import type { DoctorStatisticsReportResponse } from '@/types/reports';

export interface DoctorStatisticsFilters {
  date_from: string;
  date_to: string;
  doctor_id?: string | null;
  specialist_id?: string | null;
  sort_by?: 'patient_count' | 'total_income_generated' | 'total_entitlement' | 'doctor_name'; // Match backend
  sort_direction?: 'asc' | 'desc';
}

export const getDoctorStatisticsReport = async (
  filters: DoctorStatisticsFilters
): Promise<DoctorStatisticsReportResponse> => {
  const response = await apiClient.get<DoctorStatisticsReportResponse>(
    '/reports/doctor-statistics', 
    { params: filters }
  );
  return response.data; // Assuming backend directly returns the structure
};

export const downloadDoctorStatisticsPdf = async (filters: DoctorStatisticsFilters): Promise<Blob> => {
  const response = await apiClient.get<Blob>('/reports/doctor-statistics/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

// src/services/reportService.ts
// ... (existing imports and functions) ...
import type { CompanyPerformanceReportResponse } from '@/types/reports';

export interface CompanyPerformanceFilters {
  date_from: string;
  date_to: string;
  company_id?: string | null;
  sort_by?: 'company_name' | 'patient_count' | 'total_income_generated' | 'total_endurance_by_company' | 'net_income_from_company_patients';
  sort_direction?: 'asc' | 'desc';
}

export const getCompanyPerformanceReport = async (
  filters: CompanyPerformanceFilters
): Promise<CompanyPerformanceReportResponse> => {
  const response = await apiClient.get<CompanyPerformanceReportResponse>(
    '/reports/company-performance', 
    { params: filters }
  );
  return response.data;
};

export const downloadCompanyPerformancePdf = async (filters: CompanyPerformanceFilters): Promise<Blob> => {
  const response = await apiClient.get<Blob>('/reports/company-performance/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
// src/services/reportService.ts
// ... (existing imports and functions) ...
import type { DoctorCompanyEntitlementReportResponse } from '@/types/reports';

export interface DoctorCompanyEntitlementFilters {
  doctor_id: string; // Doctor ID is required for this report
  date_from: string;
  date_to: string;
  sort_by?: 'company_name' | 'total_entitlement'; // Optional for client-side if needed, backend handles primary sort
  sort_direction?: 'asc' | 'desc';
}

export const getDoctorCompanyEntitlementReport = async (
  filters: DoctorCompanyEntitlementFilters
): Promise<DoctorCompanyEntitlementReportResponse> => {
  const response = await apiClient.get<DoctorCompanyEntitlementReportResponse>(
    '/reports/doctor-company-entitlement', 
    { params: filters }
  );
  return response.data; 
};

export const downloadDoctorCompanyEntitlementPdf = async (filters: DoctorCompanyEntitlementFilters): Promise<Blob> => {
  const response = await apiClient.get<Blob>('/reports/doctor-company-entitlement/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

// src/services/reportService.ts
// ... (existing imports and functions) ...
import type { YearlyIncomeComparisonResponse } from '@/types/reports';

export interface YearlyIncomeComparisonFilters {
  year: number;
}

export const getYearlyIncomeComparisonReport = async (
  filters: YearlyIncomeComparisonFilters
): Promise<YearlyIncomeComparisonResponse> => {
  const response = await apiClient.get<YearlyIncomeComparisonResponse>(
    '/reports/yearly-income-comparison', 
    { params: filters }
  );
  return response.data; 
};
// src/services/reportService.ts
// ... (existing imports and functions) ...

export interface YearlyPatientFrequencyFilters {
  year: number;
}

export const getYearlyPatientFrequencyReport = async (
  filters: YearlyPatientFrequencyFilters
): Promise<YearlyPatientFrequencyReportResponse> => {
  const response = await apiClient.get<YearlyPatientFrequencyReportResponse>(
    '/reports/yearly-patient-frequency', 
    { params: filters }
  );
  return response.data;
};

// src/services/reportService.ts
// ... (existing imports and functions) ...

export interface MonthlyLabIncomeFilters {
  month: number; // 1-12
  year: number;  // e.g., 2023
  // user_id_deposited?: number; // Optional filter
}

export const getMonthlyLabIncome = async (
  filters: MonthlyLabIncomeFilters
): Promise<MonthlyLabIncomeReportResponse> => {
  const response = await apiClient.get<MonthlyLabIncomeReportResponse>(
    '/reports/monthly-lab-income', // Matches new backend route
    { params: filters }
  );
  return response.data; // Assuming backend directly returns the structure
};

export const downloadMonthlyLabIncomeReportPdf = async (filters: MonthlyLabIncomeFilters): Promise<Blob> => {
  const response = await apiClient.get('/reports/monthly-lab-income/pdf', { // Matches new backend PDF route
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

// export const downloadYearlyPatientFrequencyPdf = async (filters: YearlyPatientFrequencyFilters): Promise<Blob> => { ... }; // For future PDF