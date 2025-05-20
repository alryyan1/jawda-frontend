// src/services/companyService.ts
import apiClient from './api';
import type { Company, 
         CompanyFormData, 
         CompanyServiceContract, CompanyServiceFormData } from '../types/companies';
import type { Service } from '../types/services'; // For available services
import type { PaginatedResponse } from '@/types/common';

// Define your API base URL here or import it from a config file
const API_URL = '/companies';

// Define PaginatedCompaniesResponse type
export type PaginatedCompaniesResponse = PaginatedResponse<Company>;

export const getCompanies = (page = 1, filters: Record<string, any> = {}): Promise<PaginatedCompaniesResponse> => {
  return apiClient.get<PaginatedCompaniesResponse>(`${API_URL}`, { params: { page, ...filters } })
    .then(res => res.data);
};

// --- Company CRUD ---
export const getCompanyById = (id: number): Promise<{ data: Company }> => {
  return apiClient.get<{ data: Company }>(`${API_URL}/${id}`).then(res => res.data);
};
export const createCompany = (data: CompanyFormData): Promise<{ data: Company }> => {
  return apiClient.post<{ data: Company }>(`${API_URL}`, data).then(res => res.data);
};
export const updateCompany = (id: number, data: Partial<CompanyFormData>): Promise<{ data: Company }> => {
  return apiClient.put<{ data: Company }>(`${API_URL}/${id}`, data).then(res => res.data);
};
export const deleteCompany = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};

// --- Company Service Contract Management ---
export const getCompanyContractedServices = (companyId: number,service_name:string, page = 1): Promise<PaginatedResponse<CompanyServiceContract>> => {
  return apiClient.get(`${API_URL}/${companyId}/contracted-services`, { params: { page ,service_name} })
    .then(res => res.data);
};

export const getCompanyAvailableServices = (companyId: number): Promise<Service[]> => { // Expects an array of Service objects
  return apiClient.get(`${API_URL}/${companyId}/available-services`).then(res => res.data.data);
};

export const addServiceToCompanyContract = (companyId: number, data: CompanyServiceFormData): Promise<{ data: CompanyServiceContract }> => {
  const payload = {
    ...data,
    price: parseFloat(data.price),
    static_endurance: parseFloat(data.static_endurance),
    percentage_endurance: parseFloat(data.percentage_endurance),
    static_wage: parseFloat(data.static_wage),
    percentage_wage: parseFloat(data.percentage_wage),
  };
  return apiClient.post<{ data: CompanyServiceContract }>(`${API_URL}/${companyId}/contracted-services`, payload)
    .then(res => res.data);
};

export const updateCompanyServiceContract = (companyId: number, serviceId: number, data: Partial<CompanyServiceFormData>): Promise<{ data: CompanyServiceContract }> => {
   const payload = { ...data };
   if (data.price) payload.price = String(parseFloat(data.price)); // Convert only if present
   // ... similar conversions for other numeric fields if they are strings in form data
  return apiClient.put<{ data: CompanyServiceContract }>(`${API_URL}/${companyId}/contracted-services/${serviceId}`, payload)
    .then(res => res.data);
};

export const removeServiceFromCompanyContract = (companyId: number, serviceId: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${companyId}/contracted-services/${serviceId}`).then(res => res.data);
};