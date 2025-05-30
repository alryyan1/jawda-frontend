// src/services/requestedServiceDepositService.ts
import apiClient from './api';
import type { RequestedServiceDeposit, RequestedServiceDepositFormData } from '@/types/services';

const BASE_URL = '/requested-service-deposits'; // For direct CRUD on deposits
const REQ_SERVICE_URL = '/requested-services'; // For nested routes

/**
 * Fetches all deposits for a specific requested service.
 */
export const getDepositsForRequestedService = async (requestedServiceId: number): Promise<RequestedServiceDeposit[]> => {
  // Assuming API returns ResourceCollection which wraps in 'data'
  const response = await apiClient.get<{ data: RequestedServiceDeposit[] }>(`${REQ_SERVICE_URL}/${requestedServiceId}/deposits`);
  return response.data.data;
};

/**
 * Creates a new deposit for a requested service.
 * Note: The main payment logic is in RequestedServiceDepositController@store (backend)
 * This service function just sends the raw data.
 */
export const createRequestedServiceDeposit = async (
    requestedServiceId: number, 
    data: Omit<RequestedServiceDepositFormData, 'id'>
): Promise<RequestedServiceDeposit> => {
  const payload = {
    ...data,
    amount: parseFloat(data.amount), // Ensure amount is a number
  };
  const response = await apiClient.post<{ data: RequestedServiceDeposit }>(`${REQ_SERVICE_URL}/${requestedServiceId}/deposits`, payload);
  return response.data.data;
};

/**
 * Updates an existing deposit.
 * (Use with caution - financial records should often be immutable or have clear audit trails for changes)
 */
export const updateRequestedServiceDeposit = async (
    depositId: number, 
    data: Partial<Omit<RequestedServiceDepositFormData, 'id'>>
): Promise<RequestedServiceDeposit> => {
  const payload: Partial<any> = { ...data };
  if (data.amount) {
    payload.amount = parseFloat(data.amount);
  }
  const response = await apiClient.put<{ data: RequestedServiceDeposit }>(`${BASE_URL}/${depositId}`, payload);
  return response.data.data;
};

/**
 * Deletes a deposit.
 * (Use with extreme caution - financial records should typically not be hard deleted)
 */
export const deleteRequestedServiceDeposit = async (depositId: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${depositId}`);
};