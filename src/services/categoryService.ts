import apiClient from './api';
import type { Category, CategoryWithServices, CategoryFormData, AssignServicesPayload, CategoryServiceFormData } from '../types/categories';
import type { PaginatedResponse } from '@/types/common';
import type { Service } from '../types/services';
import type { Doctor } from '../types/doctors';

const API_URL = '/categories';

export const getCategoriesPaginated = (
  page: number = 1,
  search: string = '',
  perPage: number = 15
): Promise<PaginatedResponse<Category>> => {
  return apiClient.get(API_URL, { params: { page, search, per_page: perPage } }).then(res => res.data);
};

export const getCategory = (id: number): Promise<CategoryWithServices> => {
  return apiClient.get<{ data: CategoryWithServices }>(`${API_URL}/${id}`).then(res => res.data.data || res.data);
};

export const createCategory = (data: CategoryFormData): Promise<Category> => {
  return apiClient.post<Category>(API_URL, data).then(res => res.data);
};

export const updateCategory = (id: number, data: Partial<CategoryFormData>): Promise<Category> => {
  return apiClient.put<Category>(`${API_URL}/${id}`, data).then(res => res.data);
};

export const deleteCategory = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`);
};

export const assignServicesToCategory = (
  categoryId: number,
  payload: AssignServicesPayload
): Promise<CategoryWithServices> => {
  return apiClient.post<{ data: CategoryWithServices }>(
    `${API_URL}/${categoryId}/assign-services`,
    payload
  ).then(res => res.data.data || res.data);
};

export const updateCategoryService = (
  categoryId: number,
  serviceId: number,
  data: { percentage?: number | null; fixed?: number | null }
): Promise<Service> => {
  return apiClient.put<Service>(
    `${API_URL}/${categoryId}/services/${serviceId}`,
    data
  ).then(res => res.data);
};

export const removeServiceFromCategory = (
  categoryId: number,
  serviceId: number
): Promise<void> => {
  return apiClient.delete(`${API_URL}/${categoryId}/services/${serviceId}`);
};

export const assignDoctorToCategory = (
  categoryId: number,
  doctorId: number
): Promise<{ message: string; doctor: Doctor }> => {
  return apiClient.post<{ message: string; doctor: Doctor }>(
    `${API_URL}/${categoryId}/assign-doctor/${doctorId}`
  ).then(res => res.data);
};

export const removeDoctorFromCategory = (
  categoryId: number,
  doctorId: number
): Promise<void> => {
  return apiClient.delete(`${API_URL}/${categoryId}/remove-doctor/${doctorId}`);
};
