// src/services/subServiceCostService.ts
import apiClient from './api'; // Assuming api.ts is in the same directory or adjust path
import type { SubServiceCost } from '@/types/services'; // Adjust path to your types
import type { PaginatedResponse } from '@/types/common'; // If you use paginated responses for lists

const API_URL = '/sub-service-costs';

/**
 * Fetches a list of sub-service costs, typically for dropdowns.
 * Adjust if your API returns a paginated response or a direct array.
 */
export const getSubServiceCostsList = async (): Promise<SubServiceCost[]> => {
  // Assuming the backend route `/sub-service-costs-list` returns SubServiceCostResource::collection
  // which wraps the data in a 'data' key.
  const response = await apiClient.get<{ data: SubServiceCost[] }>(`${API_URL}-list`);
  return response.data.data;
};

/**
 * Fetches a paginated list of sub-service costs.
 */
export const getSubServiceCosts = async (page = 1, filters: Record<string, any> = {}): Promise<PaginatedResponse<SubServiceCost>> => {
  const response = await apiClient.get<PaginatedResponse<SubServiceCost>>(API_URL, { 
    params: { page, ...filters } 
  });
  return response.data; // Assuming Laravel's default pagination structure
};

/**
 * Creates a new sub-service cost.
 */
export const createSubServiceCost = async (data: { name: string }): Promise<SubServiceCost> => {
  // Assuming the backend returns SubServiceCostResource which wraps in 'data'
  const response = await apiClient.post<{ data: SubServiceCost }>(API_URL, data);
  return response.data.data;
};

/**
 * Fetches a single sub-service cost by its ID.
 */
export const getSubServiceCostById = async (id: number): Promise<SubServiceCost> => {
  const response = await apiClient.get<{ data: SubServiceCost }>(`${API_URL}/${id}`);
  return response.data.data;
};

/**
 * Updates an existing sub-service cost.
 */
export const updateSubServiceCost = async (id: number, data: Partial<{ name: string }>): Promise<SubServiceCost> => {
  const response = await apiClient.put<{ data: SubServiceCost }>(`${API_URL}/${id}`, data);
  return response.data.data;
};

/**
 * Deletes a sub-service cost by its ID.
 */
export const deleteSubServiceCost = async (id: number): Promise<void> => {
  await apiClient.delete(`${API_URL}/${id}`);
};