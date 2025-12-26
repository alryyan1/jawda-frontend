import apiClient from './api';
import type {
  AdmissionRequestedService,
  AdmissionRequestedServiceFormData,
  AdmissionRequestedServiceUpdateData,
  AdmissionRequestedServiceCost,
  AdmissionRequestedServiceDeposit,
  AdmissionServiceDepositFormData,
  AdmissionServiceCostFormData,
} from '@/types/admissions';

/**
 * Get all requested services for an admission
 */
export const getAdmissionServices = async (admissionId: number): Promise<AdmissionRequestedService[]> => {
  const response = await apiClient.get<any>(
    `/admissions/${admissionId}/requested-services`
  );
  // API returns collection wrapped in data object: { data: [...] }
  if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as any).data)) {
    return (response.data as any).data;
  }
  // Fallback: if data is array directly
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Add services to an admission
 */
export const addAdmissionServices = async (
  admissionId: number,
  data: AdmissionRequestedServiceFormData
): Promise<{ message: string; services: AdmissionRequestedService[] }> => {
  const response = await apiClient.post<{ message: string; services: AdmissionRequestedService[] }>(
    `/admissions/${admissionId}/request-services`,
    data
  );
  return response.data;
};

/**
 * Update an admission requested service
 */
export const updateAdmissionService = async (
  serviceId: number,
  data: AdmissionRequestedServiceUpdateData
): Promise<{ data: AdmissionRequestedService }> => {
  const response = await apiClient.put<{ data: AdmissionRequestedService }>(
    `/admission-requested-services/${serviceId}`,
    data
  );
  return response.data;
};

/**
 * Delete an admission requested service
 */
export const deleteAdmissionService = async (
  admissionId: number,
  serviceId: number
): Promise<void> => {
  await apiClient.delete(`/admissions/${admissionId}/requested-services/${serviceId}`);
};

/**
 * Get cost breakdown for a requested service
 */
export const getAdmissionServiceCosts = async (
  serviceId: number
): Promise<AdmissionRequestedServiceCost[]> => {
  const response = await apiClient.get<AdmissionRequestedServiceCost[]>(
    `/admission-requested-services/${serviceId}/cost-breakdown`
  );
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Add or update cost breakdown for a requested service
 */
export const addAdmissionServiceCosts = async (
  serviceId: number,
  data: AdmissionServiceCostFormData
): Promise<AdmissionRequestedServiceCost[]> => {
  const response = await apiClient.post<{ data: AdmissionRequestedServiceCost[] }>(
    `/admission-requested-services/${serviceId}/costs`,
    data
  );
  return response.data.data;
};

/**
 * Get deposits for a requested service
 */
export const getAdmissionServiceDeposits = async (
  serviceId: number
): Promise<AdmissionRequestedServiceDeposit[]> => {
  const response = await apiClient.get<AdmissionRequestedServiceDeposit[]>(
    `/admission-requested-services/${serviceId}/deposits`
  );
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Add a deposit for a requested service
 */
export const addAdmissionServiceDeposit = async (
  serviceId: number,
  data: AdmissionServiceDepositFormData
): Promise<{
  message: string;
  deposit: AdmissionRequestedServiceDeposit;
  requested_service: AdmissionRequestedService;
}> => {
  const response = await apiClient.post<{
    message: string;
    deposit: AdmissionRequestedServiceDeposit;
    requested_service: AdmissionRequestedService;
  }>(`/admission-requested-services/${serviceId}/deposits`, data);
  return response.data;
};

/**
 * Update a deposit
 */
export const updateAdmissionServiceDeposit = async (
  depositId: number,
  data: Partial<AdmissionServiceDepositFormData>
): Promise<{ data: AdmissionRequestedServiceDeposit }> => {
  const response = await apiClient.put<{ data: AdmissionRequestedServiceDeposit }>(
    `/admission-requested-service-deposits/${depositId}`,
    data
  );
  return response.data;
};

/**
 * Delete a deposit
 */
export const deleteAdmissionServiceDeposit = async (depositId: number): Promise<void> => {
  await apiClient.delete(`/admission-requested-service-deposits/${depositId}`);
};

