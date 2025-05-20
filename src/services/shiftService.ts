// src/services/shiftService.ts
import apiClient from './api';
import type { Shift } from '../types/shifts'; // Assuming Shift type from previous steps
import { CloseShiftFormData } from '../types/dashboard'; // For closing shift

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

export const openNewShift = async (data?: { pharmacy_entry?: boolean; name?: string }): Promise<Shift> => {
  const response = await apiClient.post<{ data: Shift }>(`${SHIFT_API_URL}/open`, data || {});
  return response.data.data;
};

export const closeShift = async (shiftId: number, data: CloseShiftFormData): Promise<Shift> => {
  const payload = { // Convert strings to numbers before sending if backend expects numbers
      total: parseFloat(data.total),
      bank: parseFloat(data.bank),
      expenses: parseFloat(data.expenses),
      touched: data.touched ?? false, // Send default if not provided
  };
  const response = await apiClient.put<{ data: Shift }>(`${SHIFT_API_URL}/${shiftId}/close`, payload);
  return response.data.data;
};

// Get all shifts (for a potential admin list page, not directly for dashboard open/close)
// export const getShifts = async (page = 1, filters = {}): Promise<PaginatedShiftsResponse> => { ... };