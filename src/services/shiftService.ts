// src/services/shiftService.ts
import apiClient from './api';
import type { Shift, ShiftFinancialSummary } from '../types/shifts';

const SHIFT_API_URL = '/shifts';

export interface PaginatedShiftsResponse {
  data: Shift[];
  links: unknown; 
  meta: unknown;
}

export interface ShiftListFilters {
  per_page?: number;          // How many items to return (0 or a large number for "all")
  is_closed?: string | boolean | ""; // "0" for open, "1" for closed, "" or null for all
  date_from?: string;         // YYYY-MM-DD
  date_to?: string;           // YYYY-MM-DD
  user_id_opened?: number;    // Filter by user who opened the shift
  name_search?: string;       // Search by shift name if your Shift model has a name
}

export const getCurrentOpenShift = async (): Promise<Shift | null> => {
  try {
    const response = await apiClient.get<{ data: Shift }>(`${SHIFT_API_URL}/current-open`);
    return response.data.data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number } };
      if (axiosError.response && axiosError.response.status === 404) {
        return null; // No open shift found
      }
    }
    throw error;
  }
};

export const getCurrentShift = async (): Promise<Shift | null> => {
  const response = await apiClient.get<{ data: Shift }>(`${SHIFT_API_URL}/current-shift`);
  return response.data.data;
};

export const openNewShift = async (data?: { pharmacy_entry?: boolean; name?: string }): Promise<Shift> => {
  const response = await apiClient.post<{ data: Shift }>(`${SHIFT_API_URL}/open`, data || {});
  return response.data.data;
};

export const closeShift = async (shiftId: number): Promise<Shift> => {
  const response = await apiClient.put<{ data: Shift }>(`${SHIFT_API_URL}/${shiftId}/close`);
  return response.data.data;
};

export const getShiftFinancialSummary = async (shiftId: number): Promise<ShiftFinancialSummary> => {
  const response = await apiClient.get<{ data: ShiftFinancialSummary }>(`/shifts/${shiftId}/financial-summary`);
  return response.data.data;
};

/**
 * Fetches a list of shifts, potentially filtered.
 * By default, it tries to fetch "all" by setting a high per_page or expecting
 * the backend to return all if per_page is 0 or not set to a paginating value.
 * Adjust based on your backend's ShiftController@index behavior.
 */
export const getShiftsList = async (filters: ShiftListFilters = {}): Promise<Shift[]> => {
  const params = { ...filters };
  if (params.per_page === undefined) {
    params.per_page = 0;
  }
  if (params.is_closed === "") {
      delete params.is_closed;
  }

  // Debug logging to help identify the issue
  console.log('getShiftsList called with filters:', filters);
  console.log('getShiftsList sending params:', params);

  try {
    const response = await apiClient.get<PaginatedShiftsResponse | Shift[]>('/shifts', { params });
    
    // Debug the response
    console.log('getShiftsList response:', response.data);

    // Check if the response is a Laravel paginated structure
    if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as PaginatedShiftsResponse).data)) {
      console.log('Returning paginated data:', (response.data as PaginatedShiftsResponse).data);
      return (response.data as PaginatedShiftsResponse).data;
    }
    // Check if the response is a direct array
    if (Array.isArray(response.data)) {
      console.log('Returning direct array:', response.data);
      return response.data as Shift[];
    }
    // If backend wraps a simple list in a 'data' key without full pagination meta
    if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as { data: Shift[] }).data) && !('current_page' in response.data)) {
        console.log('Returning wrapped data:', (response.data as { data: Shift[] }).data);
        return (response.data as { data: Shift[] }).data;
    }

    // Fallback or error if structure is unexpected
    console.warn("getShiftsList: Unexpected response structure. Expected paginated or direct array.", response.data);
    return [];
  } catch (error) {
    console.error("Error fetching shifts list:", error);
    throw error;
  }
};