// src/services/serviceCostService.ts
import apiClient from './api'; // Assuming api.ts is in the same directory or adjust path
import type { ServiceCost } from '@/types/services'; // Adjust path
import type { PaginatedResponse } from '@/types/common'; // If you use paginated responses

// Define the payload structure for creating/updating service costs if it's specific
export interface ServiceCostApiPayload {
  name: string;
  sub_service_cost_id: number;
  cost_type: 'total' | 'after cost';
  percentage?: number | null;
  fixed?: number | null;
}


const SERVICE_BASE_URL = '/services'; // For nested routes like /services/{service}/service-costs
const SERVICE_COST_BASE_URL = '/service-costs'; // For shallow routes like /service-costs/{service_cost}

/**
 * Fetches all service cost definitions for a specific service.
 * Returns a direct array as per current dialog usage, not paginated.
 */
export const getServiceCostsForService = async (serviceId: number): Promise<ServiceCost[]> => {
  // Assuming ServiceCostResource::collection wraps in 'data'
  const response = await apiClient.get<{ data: ServiceCost[] }>(`${SERVICE_BASE_URL}/${serviceId}/service-costs`);
  return response.data.data;
};

/**
 * Fetches a paginated list of all service costs (if an admin page needs this).
 */
// export const getAllServiceCostsPaginated = async (page = 1, filters: Record<string, any> = {}): Promise<PaginatedResponse<ServiceCost>> => {
//   const response = await apiClient.get<PaginatedResponse<ServiceCost>>(SERVICE_COST_BASE_URL, {
//     params: { page, ...filters }
//   });
//   return response.data;
// };

/**
 * Creates a new service cost definition for a specific service.
 */
export const createServiceCost = async (serviceId: number, data: ServiceCostApiPayload): Promise<ServiceCost> => {
  const response = await apiClient.post<{ data: ServiceCost }>(`${SERVICE_BASE_URL}/${serviceId}/service-costs`, data);
  return response.data.data;
};

/**
 * Fetches a single service cost definition by its ID.
 */
export const getServiceCostById = async (serviceCostId: number): Promise<ServiceCost> => {
  const response = await apiClient.get<{ data: ServiceCost }>(`${SERVICE_COST_BASE_URL}/${serviceCostId}`);
  return response.data.data;
};

/**
 * Updates an existing service cost definition.
 */
export const updateServiceCost = async (serviceCostId: number, data: Partial<ServiceCostApiPayload>): Promise<ServiceCost> => {
  const response = await apiClient.put<{ data: ServiceCost }>(`${SERVICE_COST_BASE_URL}/${serviceCostId}`, data);
  return response.data.data;
};

/**
 * Deletes a service cost definition by its ID.
 */
export const deleteServiceCost = async (serviceCostId: number): Promise<void> => {
  await apiClient.delete(`${SERVICE_COST_BASE_URL}/${serviceCostId}`);
};