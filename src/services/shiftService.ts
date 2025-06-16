// src/services/shiftService.ts
import apiClient from './api';
import type { Shift, ShiftFinancialSummary } from '../types/shifts'; // Assuming Shift type from previous steps
  // import { CloseShiftFormData } from '../types/dashboard'; // For closing shift

const SHIFT_API_URL = '/shifts';

export const getCurrentOpenShift = async (): Promise<Shift | null> => {
  try {
    const response = await apiClient.get<{ data: Shift }>(`${SHIFT_API_URL}/current-open`);
    return response.data.data; // Assuming resource wraps in 'data'
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null; // No open shift found
    }
    throw error; // Re-throw other errors
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
// Get all shifts (for a potential admin list page, not directly for dashboard open/close)
// export const getShifts = async (page = 1, filters = {}): Promise<PaginatedShiftsResponse> => { ... };

export interface PaginatedShiftsResponse { // If backend paginates
  data: Shift[];
  links: any; meta: any;
}
// Fetches a list of shifts, potentially filtered (e.g., last N days, open/closed)
export const getShiftsList = async (filters: { per_page?: number; is_closed?: string | boolean; /* other filters */ } = {}): Promise<Shift[]> => {
const response = await apiClient.get<PaginatedShiftsResponse | Shift[]>('/shifts', { params: filters }); // Adjust endpoint if different
// If paginated and wrapped in 'data': return response.data.data;
// If direct array: return response.data;
// For now, assuming it might be paginated but we want all for dropdown, or your index returns non-paginated based on params
if ('data' in response.data && Array.isArray(response.data.data)) { // Check if it's Laravel Paginated Structure
    return response.data.data;
}
return response.data as Shift[]; // Assume direct array if not paginated structure
};