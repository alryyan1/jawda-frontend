// src/services/roleService.ts
import apiClient from './api';
import type { Role, RoleFormData, Permission } from '../types/auth'; // Adjust path
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/roles';
const PERMISSIONS_API_URL = '/permissions-list';

export const getRoles = (page = 1, filters: Record<string, any> = {}): Promise<PaginatedResponse<Role>> => {
  return apiClient.get(API_URL, { params: { page, ...filters } }).then(res => res.data);
};

export const getRoleById = (id: number): Promise<{ data: Role }> => {
  return apiClient.get<{ data: Role }>(`${API_URL}/${id}`).then(res => res.data);
};

export const createRole = (data: RoleFormData): Promise<{ data: Role }> => {
  return apiClient.post<{ data: Role }>(API_URL, data).then(res => res.data);
};

export const updateRole = (id: number, data: Partial<RoleFormData>): Promise<{ data: Role }> => {
  return apiClient.put<{ data: Role }>(`${API_URL}/${id}`, data).then(res => res.data);
};

export const deleteRole = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};

export const getPermissionsList = (): Promise<Permission[]> => {
  // Backend returns RoleResource::collection, which wraps in 'data'
  return apiClient.get<{ data: Permission[] }>(PERMISSIONS_API_URL).then(res => res.data.data);
  // If backend returned Permission::all()->toArray() directly (no resource collection):
  // return apiClient.get<Permission[]>(PERMISSIONS_API_URL).then(res => res.data);
  // **VERIFY YOUR BACKEND RESPONSE STRUCTURE FOR permissions-list**
};