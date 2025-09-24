// src/services/companyService.ts
import apiClient from './api';
import type { 
    Company, 
    CompanyFormData, 
    CompanyMainTestContract, 
    CompanyMainTestFormData, 
    CompanyRelation, 
    CompanyServiceContract, 
    CompanyServiceFormData,
    PaginatedCompanyMainTestContractsResponse,
    Subcompany, 
} from '../types/companies';
import type { Service } from '../types/services';
import type { PaginatedResponse } from '@/types/common';
import type { MainTestStripped } from '@/types/labTests';

export interface ImportAllServicesPayload {
    default_static_endurance?: number;
    default_percentage_endurance?: number;
    default_static_wage?: number;
    default_percentage_wage?: number;
    default_use_static?: boolean;
    default_approval?: boolean;
}

export interface SubcompanyCreateData {
  name: string;
  company_id: number;
  lab_endurance: number;
  service_endurance: number;
}

export interface CompanyRelationCreateData {
  name: string;
  company_id: number;
  lab_endurance: number;
  service_endurance: number;
}

const API_URL = '/companies';

// --- Company CRUD ---
export const getCompanies = async (page = 1, filters: Record<string, string | number | boolean> = {}): Promise<PaginatedResponse<Company>> => {
  // This is for the paginated list on CompaniesListPage
  const response = await apiClient.get<PaginatedResponse<Company>>(API_URL, { 
    params: { page, ...filters } 
  });
  return response.data;
};

export const getCompanyById = async (id: number): Promise<{ data: Company }> => {
  const response = await apiClient.get<{ data: Company }>(`${API_URL}/${id}`);
  return response.data;
};

export const createCompany = async (data: CompanyFormData): Promise<{ data: Company }> => {
  const payload = {
    ...data,
    // Ensure numeric string fields from form are parsed to numbers if backend expects numbers directly for JSON payload
    lab_endurance: parseFloat(String(data.lab_endurance)),
    service_endurance: parseFloat(String(data.service_endurance)),
    lab_roof: parseInt(String(data.lab_roof)),
    service_roof: parseInt(String(data.service_roof)),
    finance_account_id: data.finance_account_id ? parseInt(String(data.finance_account_id)) : undefined,
  };
  const response = await apiClient.post<{ data: Company }>(API_URL, payload);
  return response.data;
};

export const updateCompany = async (id: number, data: Partial<CompanyFormData>): Promise<{ data: Company }> => {
  const payload: Record<string, string | number | boolean | undefined> = { ...data };
  // Parse numeric fields if they are present and are strings
  if (data.lab_endurance !== undefined) payload.lab_endurance = parseFloat(String(data.lab_endurance));
  if (data.service_endurance !== undefined) payload.service_endurance = parseFloat(String(data.service_endurance));
  if (data.lab_roof !== undefined) payload.lab_roof = parseInt(String(data.lab_roof));
  if (data.service_roof !== undefined) payload.service_roof = parseInt(String(data.service_roof));
  if (data.finance_account_id !== undefined) payload.finance_account_id = data.finance_account_id ? parseInt(String(data.finance_account_id)) : undefined;
  
  const response = await apiClient.put<{ data: Company }>(`${API_URL}/${id}`, payload);
  return response.data;
};

export const deleteCompany = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};

// --- NEW FUNCTION: getCompaniesList ---
/**
 * Fetches a simple list of companies, typically for dropdowns.
 * Can accept filters, e.g., to fetch only active companies.
 * Assumes the backend endpoint '/companies-list' returns an array of Company objects.
 * If CompanyController@indexList uses CompanyResource::collection, it will be wrapped in 'data'.
 */
export const getCompaniesList = async (filters: { status?: boolean } = {}): Promise<Company[]> => {
  // Assuming your CompanyController has an 'indexList' method mapped to '/companies-list'
  // And that method returns CompanyResource::collection(Company::where(...)->get())
  // which would wrap the array in a 'data' key.
  const response = await apiClient.get<{ data: Company[] }>('/companies-list', { params: filters });
  return response.data.data; 
  // IF your backend route '/companies-list' returns a direct array (e.g., Company::all()->toArray()):
  // const response = await apiClient.get<Company[]>('/companies-list', { params: filters });
  // return response.data;
};


export const importAllServicesToCompanyContract = async (
    companyId: number, 
    payload?: ImportAllServicesPayload
): Promise<{ message: string; imported_count: number }> => {
  const response = await apiClient.post<{ message: string; imported_count: number }>(
      `${API_URL}/${companyId}/contracted-services/import-all`, 
      payload || {} // Send empty object if no overrides
  );
  return response.data;
};

// --- Company Service Contract Management ---
export const getCompanyContractedServices = (companyId: number, page = 1, filters: { search?: string } = {}): Promise<PaginatedResponse<CompanyServiceContract>> => {
  return apiClient.get<PaginatedResponse<CompanyServiceContract>>(`${API_URL}/${companyId}/contracted-services`, { params: { page, ...filters } })
    .then(res => res.data);
};
// src/services/companyService.ts
// ... (existing imports and functions) ...

export const copyServiceContractsFromCompany = async (
  targetCompanyId: number,
  sourceCompanyId: number
): Promise<{ message: string; copied_count: number }> => {
  const response = await apiClient.post<{ message: string; copied_count: number }>(
    `${API_URL}/${targetCompanyId}/copy-contracts-from/${sourceCompanyId}`
  );
  return response.data;
};

export const getCompanyAvailableServices = (companyId: number): Promise<Service[]> => {
  // Assuming this backend endpoint returns ServiceResource::collection which wraps in 'data'
  return apiClient.get<{ data: Service[] }>(`${API_URL}/${companyId}/available-services`).then(res => res.data.data);
};

export const addServiceToCompanyContract = (companyId: number, data: CompanyServiceFormData): Promise<{ data: CompanyServiceContract }> => {
  return apiClient.post<{ data: CompanyServiceContract }>(`${API_URL}/${companyId}/contracted-services`, data)
    .then(res => res.data);
};

export const updateCompanyServiceContract = (companyId: number, serviceId: number, data: Partial<CompanyServiceFormData>): Promise<{ data: CompanyServiceContract }> => {
  return apiClient.put<{ data: CompanyServiceContract }>(`${API_URL}/${companyId}/contracted-services/${serviceId}`, data)
    .then(res => res.data);
};

export const removeServiceFromCompanyContract = (companyId: number, serviceId: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${companyId}/contracted-services/${serviceId}`).then(res => res.data);
};

// --- Bulk operations ---
export const activateAllCompanies = async (): Promise<{ message: string; updated_count: number }> => {
  const response = await apiClient.post<{ message: string; updated_count: number }>(`${API_URL}/activate-all`);
  return response.data;
};


// --- Company Main Test Contract Management ---
export const getCompanyContractedMainTests = (
  companyId: number, 
  page = 1, 
  filters: { search?: string } = {}
): Promise<PaginatedCompanyMainTestContractsResponse> => {
return apiClient.get<PaginatedCompanyMainTestContractsResponse>(
      `${API_URL}/${companyId}/contracted-main-tests`, 
      { params: { page, ...filters } }
  ).then(res => res.data);
};

export const getCompanyAvailableMainTests = (companyId: number): Promise<MainTestStripped[]> => {
// Assuming backend returns MainTestStrippedResource::collection which wraps in 'data'
return apiClient.get<{ data: MainTestStripped[] }>(`${API_URL}/${companyId}/available-main-tests`)
  .then(res => res.data.data);
};

export const addMainTestToCompanyContract = (
  companyId: number, 
  data: CompanyMainTestFormData
): Promise<{ data: CompanyMainTestContract }> => {
// Ensure data transformation if necessary (e.g., string numbers to float/int)
const payload = {
    ...data,
    price: parseFloat(data.price),
    endurance_static: parseInt(data.endurance_static),
    endurance_percentage: parseFloat(data.endurance_percentage),
};
return apiClient.post<{ data: CompanyMainTestContract }>(
      `${API_URL}/${companyId}/contracted-main-tests`, 
      payload
  ).then(res => res.data);
};

export const updateCompanyMainTestContract = (
  companyId: number, 
  mainTestId: number, // MainTest ID identifies the contract along with companyId
  data: Partial<CompanyMainTestFormData>
): Promise<{ data: CompanyMainTestContract }> => {
 const payload: Record<string, string | number | boolean | undefined> = { ...data };
 if (data.price !== undefined) payload.price = parseFloat(data.price);
 if (data.endurance_static !== undefined) payload.endurance_static = parseInt(data.endurance_static);
 if (data.endurance_percentage !== undefined) payload.endurance_percentage = parseFloat(data.endurance_percentage);
 
return apiClient.put<{ data: CompanyMainTestContract }>(
      `${API_URL}/${companyId}/contracted-main-tests/${mainTestId}`, 
      payload
  ).then(res => res.data);
};

export const removeMainTestFromCompanyContract = (companyId: number, mainTestId: number): Promise<void> => {
return apiClient.delete(`${API_URL}/${companyId}/contracted-main-tests/${mainTestId}`)
  .then(res => res.data);
};

interface ImportAllMainTestsPayload {
  default_status?: boolean;
  default_approve?: boolean;
  default_endurance_static?: number;
  default_endurance_percentage?: number;
  default_use_static?: boolean;
}

export const importAllMainTestsToCompanyContract = async (
  companyId: number, 
  payload?: ImportAllMainTestsPayload
): Promise<{ message: string; imported_count: number }> => {
const response = await apiClient.post<{ message: string; imported_count: number }>(
    `${API_URL}/${companyId}/contracted-main-tests/import-all`, 
    payload || {}
);
return response.data;
};

export const copyMainTestContractsFromCompany = async (
  targetCompanyId: number,
  sourceCompanyId: number
): Promise<{ message: string; copied_count: number }> => {
  const response = await apiClient.post<{ message: string; copied_count: number }>(
    `${API_URL}/${targetCompanyId}/copy-main-test-contracts-from/${sourceCompanyId}`
  );
  return response.data;
};

export const createSubcompany = async (data: SubcompanyCreateData): Promise<Subcompany> => {
  const response = await apiClient.post<{ data: Subcompany }>(`${API_URL}/${data.company_id}/subcompanies`, data);
  return response.data.data;
};

export const createCompanyRelation = async (data: CompanyRelationCreateData): Promise<CompanyRelation> => {
  const response = await apiClient.post<{ data: CompanyRelation }>(`${API_URL}/${data.company_id}/relations`, data);
  return response.data.data;
};

export const getSubcompaniesList = async (companyId: number): Promise<Subcompany[]> => {
  const response = await apiClient.get<{ data: Subcompany[] }>(`${API_URL}/${companyId}/subcompanies`);
  return response.data.data;
};

export const getCompanyRelationsList = async (): Promise<CompanyRelation[]> => {
  const response = await apiClient.get<{ data: CompanyRelation[] }>('/company-relations');
  return response.data.data;
};
// /reports/company/{company}/test-contracts/pdf
// --- PDF Generation ---
export const generateCompanyMainTestContractPdf = async (
  companyId: number, 
  search?: string
): Promise<Blob> => {
  const response = await apiClient.get(`/reports/company/${companyId}/test-contracts/pdf`, {
    params: { search },
    responseType: 'blob'
  });
  return response.data;
};