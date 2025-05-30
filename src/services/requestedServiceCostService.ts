// src/services/requestedServiceCostService.ts
import type { RequestedServiceCost } from '@/types/services';
import apiClient from './api';

const BASE_URL = '/requested-service-costs';
const REQ_SERVICE_BASE_URL = '/requested-services';

interface RequestedServiceCostApiPayload {
  sub_service_cost_id: number;
  service_cost_id: number; // ID of the ServiceCost definition used
  amount: number;
}

/**
 * Fetches all cost breakdown entries for a specific RequestedService.
 */
export const getCostsForRequestedService = async (requestedServiceId: number): Promise<RequestedServiceCost[]> => {
  const response = await apiClient.get<{ data: RequestedServiceCost[] }>(`${REQ_SERVICE_BASE_URL}/${requestedServiceId}/cost-breakdown`);
  return response.data.data; // Assuming collection resource
};

/**
 * Creates or updates a RequestedServiceCost entry.
 * If itemId is provided, it's an update (PUT), otherwise it's a create (POST).
 * The backend should handle this logic based on whether an ID is part of the route or payload.
 * For simplicity, assuming a single endpoint on backend that handles upsert,
 * or distinct create/update if preferred.
 *
 * This example assumes backend will handle PUT for update if ID is in URL, POST for create to collection.
 */
export const createOrUpdateRequestedServiceCost = async (
  requestedServiceId: number,
  itemId: number | undefined | null, // ID of the RequestedServiceCost item (if updating)
  data: RequestedServiceCostApiPayload
): Promise<RequestedServiceCost> => {
  if (itemId) { // Update existing
    const response = await apiClient.put<{ data: RequestedServiceCost }>(`${BASE_URL}/${itemId}`, { ...data, requested_service_id: requestedServiceId });
    return response.data.data;
  } else { // Create new
    const response = await apiClient.post<{ data: RequestedServiceCost }>(`${REQ_SERVICE_BASE_URL}/${requestedServiceId}/costs`, data); // Example POST to collection
    return response.data.data;
  }
};

/**
 * Deletes a specific RequestedServiceCost entry.
 */
export const deleteRequestedServiceCost = async (requestedServiceCostId: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${requestedServiceCostId}`);
};