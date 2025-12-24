
import apiClient from './api';
import type { ChildTest, ChildTestFormData } from '../types/labTests';

const getBaseUrl = (mainTestId: number) => `/main-tests/${mainTestId}/child-tests`;

export const getChildTestsForMainTest = async (mainTestId: number): Promise<ChildTest[]> => {
  const response = await apiClient.get<{ data: ChildTest[] }>(getBaseUrl(mainTestId));
  return response.data.data; // Assuming ChildTestResource::collection wraps in 'data'
};

export const createChildTest = async (mainTestId: number, data: ChildTestFormData): Promise<ChildTest> => {
  // If needed, transform string numbers to actual numbers here.
  const response = await apiClient.post<{ data: ChildTest }>(getBaseUrl(mainTestId), data);
  return response.data.data;
};

// Note: Update and Delete use the shallow routes /child-tests/{child_test_id}
export const updateChildTest = async (childTestId: number, data: Partial<ChildTestFormData>): Promise<ChildTest> => {
  const response = await apiClient.put<{ data: ChildTest }>(`/child-tests/${childTestId}`, data);
  return response.data.data;
};

export const deleteChildTest = async (childTestId: number): Promise<void> => {
  await apiClient.delete(`/child-tests/${childTestId}`);
};

export const batchUpdateChildTestOrder = async (mainTestId: number, orderedChildTestIds: number[]): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>(`/main-tests/${mainTestId}/child-tests/batch-update-order`, {
    child_test_ids: orderedChildTestIds,
  });
  return response.data;
};

export const getChildTestById = async (childTestId: number): Promise<ChildTest> => {
  const response = await apiClient.get<{ data: ChildTest }>(`/child-tests/${childTestId}`);
  return response.data.data;
};

export const getChildTestJsonParams = async (childTestId: number): Promise<unknown> => {
  const response = await apiClient.get<{ data: { json_params: unknown } }>(`/child-tests/${childTestId}/json-params`);
  return response.data.data.json_params;
};

export const updateChildTestJsonParams = async (childTestId: number, json: unknown): Promise<unknown> => {
  const response = await apiClient.put<{ data: { json_params: unknown } }>(`/child-tests/${childTestId}/json-params`, { json_params: json, json_parameter: json });
  return response.data.data.json_params;
};

export const getAllChildTests = async (search?: string, limit: number = 100): Promise<ChildTest[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  params.append('limit', limit.toString());
  const response = await apiClient.get<{ data: ChildTest[] }>(`/child-tests?${params.toString()}`);
  return response.data.data;
};