// src/services/shiftDefinitionService.ts
import apiClient from './api';
import type { ShiftDefinition, ShiftDefinitionFormData } from '@/types/attendance';
// No PaginatedResponse needed if index always returns all for this management page,
// or add it if you decide to paginate the definitions list.

const API_URL = '/attendance-config/shift-definitions';

export const getShiftDefinitions = (activeOnly: boolean = false): Promise<ShiftDefinition[]> => {
  return apiClient.get<{ data: ShiftDefinition[] }>(API_URL, { params: { active_only: activeOnly } })
    .then(res => res.data.data); // Assuming collection resource wraps in 'data'
};

export const getShiftDefinitionById = (id: number): Promise<ShiftDefinition> => {
  return apiClient.get<{ data: ShiftDefinition }>(`${API_URL}/${id}`)
    .then(res => res.data.data);
};

export const createShiftDefinition = (data: ShiftDefinitionFormData): Promise<ShiftDefinition> => {
  return apiClient.post<{ data: ShiftDefinition }>(API_URL, data)
    .then(res => res.data.data);
};

export const updateShiftDefinition = (id: number, data: Partial<ShiftDefinitionFormData>): Promise<ShiftDefinition> => {
  return apiClient.put<{ data: ShiftDefinition }>(`${API_URL}/${id}`, data)
    .then(res => res.data.data);
};

export const deleteShiftDefinition = (id: number): Promise<void> => {
  return apiClient.delete(`${API_URL}/${id}`).then(res => res.data);
};

// For dropdowns, you might use the same getShiftDefinitions with activeOnly=true
export const getActiveShiftDefinitionsList = (): Promise<ShiftDefinition[]> => {
    return apiClient.get<{data: ShiftDefinition[]}>(`${API_URL}/list`).then(res => res.data.data);
}