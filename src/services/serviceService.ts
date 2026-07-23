


import apiClient from './api';
import type { Service, ServiceFormData } from '../types/services';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/services';

export const getServicesList = (): Promise<{ id: number; name: string }[]> =>
  apiClient.get<{ data: { id: number; name: string }[] }>('/services-list').then(res => res.data.data);

export const getServices = (page = 1, filters: Record<string, any> = {}): Promise<PaginatedResponse<Service>> => {
  return apiClient.get<PaginatedResponse<Service>>(API_URL, { params: { page, ...filters } }).then(res => res.data);
};

export const getServiceById = (id: number): Promise<{ data: Service }> => {
  return apiClient.get<{ data: Service }>(`${API_URL}/${id}`).then(res => res.data);
};

export const createService = (data: ServiceFormData): Promise<{ data: Service }> => {
  const payload = {
    ...data,
    price: parseFloat(data.price), // Ensure price is a number
    has_cost: Boolean(data.has_cost),
  };
  return apiClient.post<{ data: Service }>(API_URL, payload).then(res => res.data);
};

export const updateService = (id: number, data: Partial<ServiceFormData>): Promise<{ data: Service }> => {
  const payload = {
    ...data,
    ...(data.price ? { price: parseFloat(data.price) } : {}), // Ensure price is a number if present
    ...(typeof data.has_cost === 'boolean' ? { has_cost: data.has_cost } : {}),
  };
  return apiClient.put<{ data: Service }>(`${API_URL}/${id}`, payload).then(res => res.data);
};

export const deleteService = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};

export const restoreService = (id: number): Promise<{ message: string; data: Service }> => {
  return apiClient.post<{ message: string; data: Service }>(`${API_URL}/${id}/restore`).then(res => res.data);
};

export const getTrashedServices = (): Promise<{ data: Service[] }> => {
  return apiClient.get<{ data: Service[] }>(`${API_URL}/trashed`).then(res => res.data);
};



// Activate all services
export const activateAllServices = async (): Promise<{ message: string; affected_count?: number }> => {
    const response = await apiClient.post('/services/activate-all');
    return response.data;
};