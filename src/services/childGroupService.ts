import apiClient from './api';
import type { ChildGroup } from '@/types/labTests';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/child-groups';

export const getChildGroups = (page = 1, filters: Record<string, unknown> = {}): Promise<PaginatedResponse<ChildGroup>> => {
  return apiClient.get(`${API_URL}-list`, { params: { page, ...filters } }).then(res => res.data);
};

export const getChildGroupById = (id: number): Promise<{ data: ChildGroup }> => {
  return apiClient.get<{ data: ChildGroup }>(`${API_URL}/${id}`).then(res => res.data);
};

export interface CreateChildGroupData {
  name: string;
}

export const createChildGroup = (data: CreateChildGroupData): Promise<ChildGroup> => {
  return apiClient.post<{ data: ChildGroup }>(API_URL, data).then(res => res.data.data);
};

export const updateChildGroup = (id: number, data: Partial<CreateChildGroupData>): Promise<ChildGroup> => {
  return apiClient.put<{ data: ChildGroup }>(`${API_URL}/${id}`, data).then(res => res.data.data);
};

export const deleteChildGroup = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};