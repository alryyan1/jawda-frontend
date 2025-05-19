import apiClient from './api';
import type { Service, ServiceFormData } from '../types/services';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/services';

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
  };
  return apiClient.post<{ data: Service }>(API_URL, payload).then(res => res.data);
};

export const updateService = (id: number, data: Partial<ServiceFormData>): Promise<{ data: Service }> => {
  const payload = {
    ...data,
    ...(data.price && { price: parseFloat(data.price) }), // Ensure price is a number if present
  };
  return apiClient.put<{ data: Service }>(`${API_URL}/${id}`, payload).then(res => res.data);
};

export const deleteService = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};