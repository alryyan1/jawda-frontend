// src/services/requestedServiceCostService.ts
import apiClient from './api';
import type { RequestedServiceCost } from '@/types/services';

const REQ_SERVICE_URL = '/requested-services';

export const getRequestedServiceCosts = async (requestedServiceId: number): Promise<RequestedServiceCost[]> => {
  const response = await apiClient.get<{ data: RequestedServiceCost[] }>(`${REQ_SERVICE_URL}/${requestedServiceId}/costs`);
  return response.data.data;
};

export const createRequestedServiceCost = async (
  requestedServiceId: number,
  partyId: number,
): Promise<RequestedServiceCost> => {
  const response = await apiClient.post<{ data: RequestedServiceCost }>(
    `${REQ_SERVICE_URL}/${requestedServiceId}/costs`,
    { party_id: partyId },
  );
  return response.data.data;
};

const COST_URL = '/requested-service-costs';

export const updateRequestedServiceCost = async (
  costId: number,
  data: { amount?: number | null; party_id?: number },
): Promise<RequestedServiceCost> => {
  const response = await apiClient.put<{ data: RequestedServiceCost }>(
    `${COST_URL}/${costId}`,
    data,
  );
  return response.data.data;
};

export const deleteRequestedServiceCost = async (costId: number): Promise<void> => {
  await apiClient.delete(`${COST_URL}/${costId}`);
};
