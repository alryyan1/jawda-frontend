// src/services/doctorService.ts
import apiClient from './api';
import type { Doctor, DoctorFormData, PaginatedDoctorsResponse, Specialist, FinanceAccount, DoctorStripped, DoctorServiceFormData, DoctorService } from '../types/doctors'; // Adjust imports as needed
import type { Service } from '@/types/services';

const API_URL = '/doctors';

interface DoctorFilters {
  search?: string;
  [key: string]: any;
}

export const getDoctors = (page = 1, filters: DoctorFilters = {}): Promise<PaginatedDoctorsResponse> => {
  return apiClient.get(API_URL, { params: { page, ...filters } }).then(res => res.data);
};

export const getDoctorById = (id: number): Promise<{ data: Doctor }> => {
  return apiClient.get<{ data: Doctor }>(`${API_URL}/${id}`).then(res => res.data);
};

// Helper to build FormData
const buildDoctorFormData = (data: Partial<DoctorFormData>, method?: 'PUT' | 'POST'): FormData => {
    const formData = new FormData();
    if (method === 'PUT') {
        formData.append('_method', 'PUT');
    }

    (Object.keys(data) as Array<keyof DoctorFormData>).forEach(key => {
        const value = data[key];
        if (key === 'image_file' && value instanceof File) {
            formData.append(key, value);
        } else if (typeof value === 'boolean') {
            formData.append(key, value ? '1' : '0');
        } else if (value !== null && value !== undefined && key !== 'image') { // Don't send 'image' string if 'image_file' is present
            formData.append(key, String(value));
        } else if (key === 'image' && value && !data.image_file) { // Send existing image path if no new file
             formData.append(key, String(value));
        }
    });
    return formData;
};

// --- THIS IS THE FUNCTION WE NEED FOR DROPDOWNS ---
export const getDoctorsList = async (filters: { active?: boolean } = {}): Promise<DoctorStripped[]> => {
  // Assuming your DoctorController@indexList returns DoctorStrippedResource::collection
  // which by default wraps the array in a 'data' key.
  const response = await apiClient.get<{ data: DoctorStripped[] }>('/doctors-list', { params: filters });
  return response.data.data;

  // IF your backend route '/doctors-list' returns a direct array
  // (e.g., from $doctors->map(...)->toArray() without a ResourceCollection):
  // const response = await apiClient.get<DoctorStripped[]>('/doctors-list', { params: filters });
  // return response.data;
};
export const createDoctor = (data: DoctorFormData): Promise<{ data: Doctor }> => {
  const formData = buildDoctorFormData(data, 'POST');
  return apiClient.post<{ data: Doctor }>(API_URL, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data);
};

export const updateDoctor = (id: number, data: Partial<DoctorFormData>): Promise<{ data: Doctor }> => {
  const formData = buildDoctorFormData(data, 'PUT');
  // For updates with FormData, Laravel expects POST with _method field
  return apiClient.post<{ data: Doctor }>(`${API_URL}/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data);
};

export const deleteDoctor = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};

// For fetching lists for dropdowns
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links?: {
      prev?: string | null;
      next?: string | null;
    };
  };
}

export const getSpecialistsList = (): Promise<Specialist[]> => { // Assuming direct array response
    return apiClient.get<PaginatedResponse<Specialist>>('/specialists-list').then(res => res.data.data);
}
export const getFinanceAccountsList = (): Promise<FinanceAccount[]> => { // Assuming direct array response
    return apiClient.get('/finance-accounts-list').then(res => res.data.data);
}
// Ensure this function is EXPORTED
export const createSpecialist = async (data: { name: string }): Promise<Specialist> => {
  // Assuming your API returns the created specialist directly or wrapped in a 'data' key
  // If wrapped: const response = await apiClient.post<{ data: Specialist }>('/specialists', data); return response.data.data;
  const response = await apiClient.post<Specialist>('/specialists', data); // If not wrapped
  return response.data; 
  // IMPORTANT: Adjust the '.data' access based on how your SpecialistResource actually structures the response.
  // If SpecialistResource returns { data: { ...specialist... } }, then it should be:
  // const response = await apiClient.post<{ data: Specialist }>('/specialists', data);
  // return response.data.data;
};
export const DoctorFormMode = { CREATE: 'create', EDIT: 'edit' } as const;
export type DoctorFormMode = (typeof DoctorFormMode)[keyof typeof DoctorFormMode];
// src/services/doctorService.ts OR a new src/services/doctorSpecificService.ts

// ... existing imports and functions ...
// Assuming Service type is available from '@/types/services'

const DOCTOR_API_URL = '/doctors'; // Base for doctor related things

export interface PaginatedDoctorServicesResponse extends PaginatedResponse<DoctorService> {}

export const getConfiguredServicesForDoctor = async (
  doctorId: number, 
  page: number = 1, 
  search?: string
): Promise<PaginatedDoctorServicesResponse> => {
  const params: any = { page };
  if (search) params.search_service_name = search;
  const response = await apiClient.get<PaginatedDoctorServicesResponse>(`${DOCTOR_API_URL}/${doctorId}/configured-services`, { params });
  return response.data;
};

export const getAvailableServicesForDoctorConfig = async (doctorId: number): Promise<Service[]> => {
  const response = await apiClient.get<{data: Service[]}>(`${DOCTOR_API_URL}/${doctorId}/available-services-for-config`);
  return response.data.data; // Assuming collection resource
};

export const addServiceConfigurationForDoctor = async (
  doctorId: number, 
  data: DoctorServiceFormData // { service_id: number, percentage?: number, fixed?: number }
): Promise<DoctorService> => {
  const response = await apiClient.post<{ data: DoctorService }>(`${DOCTOR_API_URL}/${doctorId}/configure-service`, data);
  return response.data.data;
};

export const updateServiceConfigurationForDoctor = async (
  doctorId: number, 
  serviceId: number, 
  data: Partial<DoctorServiceFormData> // Only percentage or fixed usually
): Promise<DoctorService> => {
  const response = await apiClient.put<{ data: DoctorService }>(`${DOCTOR_API_URL}/${doctorId}/configure-service/${serviceId}`, data);
  return response.data.data;
};

export const removeServiceConfigurationFromDoctor = async (
  doctorId: number, 
  serviceId: number
): Promise<void> => {
  await apiClient.delete(`${DOCTOR_API_URL}/${doctorId}/configure-service/${serviceId}`);
};