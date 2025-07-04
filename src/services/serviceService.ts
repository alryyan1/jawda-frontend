


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






export interface BatchUpdateCondition {
    field: 'service_group_id' | 'price' | 'name'; // Add more fields as you support them
    operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE';
    value: string | number;
}

export interface BatchUpdatePayload {
    update_mode: 'increase' | 'decrease';
    update_type: 'percentage' | 'fixed_amount';
    update_value: number;
    conditions: BatchUpdateCondition[];
}

// For previewing the update
export const previewBatchUpdateServicePrices = async (payload: BatchUpdatePayload): Promise<{ affected_count: number }> => {
    const response = await apiClient.post('/services/batch-update-prices', { ...payload, is_preview: true });
    return response.data;
};

// For executing the update
export const executeBatchUpdateServicePrices = async (payload: BatchUpdatePayload): Promise<{ message: string }> => {
    const response = await apiClient.post('/services/batch-update-prices', payload);
    return response.data;
};