import apiClient from './api';
import type { ServiceGroup } from '../types/services';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/service-groups';

export const getServiceGroupsList = (): Promise<PaginatedResponse<ServiceGroup>> => {
  return apiClient.get(`${API_URL}-list`).then(res => res.data);
};

export const createServiceGroup = async (data: { name: string }): Promise<ServiceGroup> => {
  // Assuming your API returns the created group directly or wrapped in 'data'
  const response = await apiClient.post<{ data: ServiceGroup }>(API_URL, data);
  return response.data.data; // Adjust if not wrapped
};