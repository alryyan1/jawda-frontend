import apiClient from './api';
import type { MainTest, MainTestFormData } from '../types/labTests';
import type { PaginatedResponse } from '@/types/common';
import type { Container } from '@/types/labTests';

const API_URL = '/main-tests';

export const getMainTests = (page = 1, filters: Record<string, any> = {}): Promise<PaginatedResponse<MainTest>> => {
  return apiClient.get(API_URL, { params: { page, ...filters } }).then(res => res.data);
};

export const getMainTestById = (id: number): Promise<{ data: MainTest }> => {
  return apiClient.get<{ data: MainTest }>(`${API_URL}/${id}`).then(res => res.data);
};

export const createMainTest = (data: MainTestFormData): Promise<{ data: MainTest }> => {
  const payload = {
    ...data,
    price: data.price ? parseFloat(data.price) : null,
    pack_id: data.pack_id ? parseInt(data.pack_id) : null,
  };
  return apiClient.post<{ data: MainTest }>(API_URL, payload).then(res => res.data);
};

export const updateMainTest = (id: number, data: Partial<MainTestFormData>): Promise<{ data: MainTest }> => {
  const payload: Record<string, any> = { ...data };
  if (data.price !== undefined) payload.price = data.price ? parseFloat(data.price) : null;
  if (data.pack_id !== undefined) payload.pack_id = data.pack_id ? parseInt(data.pack_id) : null;
  return apiClient.put<{ data: MainTest }>(`${API_URL}/${id}`, payload).then(res => res.data);
};

export const deleteMainTest = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};

export const getContainers = (page = 1, filters: Record<string, any> = {}): Promise<PaginatedResponse<Container>> => {
  return apiClient.get('/containers-list', { params: { page, ...filters } }).then(res => res.data);
};

export const getContainerById = (id: number): Promise<{ data: Container }> => {
  return apiClient.get<{ data: Container }>(`/containers/${id}`).then(res => res.data);
};

export interface CreateContainerData {
  container_name: string;
}

export const createContainer = (data: CreateContainerData): Promise<Container> => {
  return apiClient.post<{ data: Container }>('/containers', data).then(res => res.data.data);
};

export const updateContainer = (id: number, data: Partial<CreateContainerData>): Promise<Container> => {
  return apiClient.put<{ data: Container }>(`/containers/${id}`, data).then(res => res.data.data);
};

export const deleteContainer = (id: number): Promise<void> => {
  return apiClient.delete(`/containers/${id}`).then(res => res.data);
};