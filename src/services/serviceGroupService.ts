import apiClient from './api';
import type { ServiceGroup } from '../types/services';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/service-groups';

export const getServiceGroupsList = (): Promise<PaginatedResponse<ServiceGroup>> => {
  return apiClient.get(`${API_URL}-list`).then(res => res.data);
};




export interface ServiceGroupFormData {
  name: string;
}

export const getServiceGroupsPaginated = (
  page: number = 1, 
  search: string = '', 
  perPage: number = 15
): Promise<PaginatedResponse<ServiceGroup>> => {
  return apiClient.get(API_URL, { params: { page, search, per_page: perPage } }).then(res => res.data);
};

export const getAllServiceGroupsList = (): Promise<ServiceGroup[]> => {
  // Assuming the indexList returns a simple array wrapped in data
  return apiClient.get<{ data: ServiceGroup[] }>(`${API_URL}-list`).then(res => res.data.data);
};

export const getServiceGroupById = (id: number): Promise<ServiceGroup> => {
  return apiClient.get<{data: ServiceGroup}>(`${API_URL}/${id}`).then(res => res.data.data);
};

export const createServiceGroup = (data: ServiceGroupFormData): Promise<ServiceGroup> => {
  return apiClient.post<{data: ServiceGroup}>(API_URL, data).then(res => res.data.data);
};

export const updateServiceGroup = (id: number, data: Partial<ServiceGroupFormData>): Promise<ServiceGroup> => {
  return apiClient.put<{data: ServiceGroup}>(`${API_URL}/${id}`, data).then(res => res.data.data);
};

export const deleteServiceGroup = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};

// getServiceGroupsWithServices can remain if used elsewhere for service selection
export const getServiceGroupsWithServices = async (visitId?: number): Promise<ServiceGroupWithServices[]> => {
  const params = visitId ? { visit_id: visitId } : {};
  const response = await apiClient.get<{ data: ServiceGroupWithServices[] }>('/service-groups-with-services', { params });
  return response.data.data;
};
interface ServiceGroupWithServices extends ServiceGroup { // Ensure this type is defined if not already
  services: Service[];
}
interface Service { // Basic service type
    id: number;
    name: string;
    price: number;
    activate: boolean;
    // ... other service fields if needed by ServiceGroupWithServicesResource
}