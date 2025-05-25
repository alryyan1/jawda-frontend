// src/services/packageService.ts
import apiClient from './api';
import type { Package, PackageFormData, PaginatedPackagesResponse, PackageQuickAddFormData } from '../types/labTests'; // Adjust PackageFormData if needed

const API_URL = '/packages';

// For the main Package CRUD page (if you build one)
export const getPackages = async (page = 1, filters = {}): Promise<PaginatedPackagesResponse> => {
  const response = await apiClient.get<PaginatedPackagesResponse>(API_URL, { params: { page, ...filters } });
  return response.data;
};

// For the dropdown in MainTestForm
export const getPackagesList = async (): Promise<Package[]> => {
  // Assumes backend /packages-list returns an array of {id: number, name: string}
  const response = await apiClient.get<Package[]>(`${API_URL}-list`);
  return response.data; // If backend returns direct array
  // If backend wraps in { data: [] }: return response.data.data;
};

// For the quick-add dialog
export const createPackageQuick = async (data: PackageQuickAddFormData): Promise<Package> => {
  const payload = {
    ...data,
    exp_time: parseInt(data.exp_time),
  };
  // Assumes backend PackageController@store returns a PackageResource wrapped in 'data'
  const response = await apiClient.post<{ data: Package }>(API_URL, payload);
  return response.data.data; 
};

// Add getPackageById, updatePackage, deletePackage later for full Package CRUD page