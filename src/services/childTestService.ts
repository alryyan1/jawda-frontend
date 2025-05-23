import apiClient from './api';
import type { ChildTest, ChildTestFormData } from '../types/labTests';

const getBaseUrl = (mainTestId: number) => `/main-tests/${mainTestId}/child-tests`;

export const getChildTestsForMainTest = async (mainTestId: number): Promise<ChildTest[]> => {
  const response = await apiClient.get<{ data: ChildTest[] }>(getBaseUrl(mainTestId));
  return response.data.data; // Assuming ChildTestResource::collection wraps in 'data'
};

export const createChildTest = async (mainTestId: number, data: ChildTestFormData): Promise<ChildTest> => {
  const payload = { /* ... transform string numbers to actual numbers if needed ... */ ...data };
  // Example transformation:
  // const payload = {
  //   ...data,
  //   low: data.low ? parseFloat(data.low) : null,
  //   upper: data.upper ? parseFloat(data.upper) : null,
  //   // ... etc. for numeric fields
  //   test_order: data.test_order ? parseInt(data.test_order) : null,
  // };
  // alert('createChildTest')
  const response = await apiClient.post<{ data: ChildTest }>(getBaseUrl(mainTestId), data);
  return response.data.data;
};

// Note: Update and Delete use the shallow routes /child-tests/{child_test_id}
export const updateChildTest = async (childTestId: number, data: Partial<ChildTestFormData>): Promise<ChildTest> => {
  const payload = { /* ... transform data ... */ ...data };
  const response = await apiClient.put<{ data: ChildTest }>(`/child-tests/${childTestId}`, payload);
  return response.data.data;
};

export const deleteChildTest = async (childTestId: number): Promise<void> => {
  await apiClient.delete(`/child-tests/${childTestId}`);
};