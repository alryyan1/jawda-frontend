// src/services/childTestOptionService.ts
import apiClient from './api';
import { ChildTestOption } from '../types/labTests';

const getBaseUrl = (childTestId: number) => `/child-tests/${childTestId}/options`;

export const getChildTestOptionsList = async (childTestId: number): Promise<ChildTestOption[]> => {
  const response = await apiClient.get<{ data: ChildTestOption[] }>(getBaseUrl(childTestId));
  return response.data.data;
};
export const createChildTestOption = async (childTestId: number, data: { name: string }): Promise<ChildTestOption> => {
  const response = await apiClient.post<{ data: ChildTestOption }>(getBaseUrl(childTestId), data);
  return response.data.data;
};
export const updateChildTestOption = async (optionId: number, data: { name: string }): Promise<ChildTestOption> => {
  const response = await apiClient.put<{ data: ChildTestOption }>(`/options/${optionId}`, data);
  return response.data.data;
};
export const deleteChildTestOption = async (optionId: number): Promise<void> => {
  await apiClient.delete(`/options/${optionId}`);
};