import apiClient from './api'; // Your configured axios instance
import type { DailySheetResponse, MonthlyAttendanceReportData, ShiftDefinition } from '@/types/attendance'; // Define this type

export interface ShiftDefinitionFormData {
  name: string;
  shift_label: string;
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
  is_active?: boolean;
}

// Shift Definitions
export const getShiftDefinitions = async (params?: { active_only?: boolean }): Promise<ShiftDefinition[]> => {
  const response = await apiClient.get('/attendance-config/shift-definitions', { params });
  return response.data.data; // Assuming Laravel Resource Collection
};

export const createShiftDefinition = async (data: ShiftDefinitionFormData): Promise<ShiftDefinition> => {
  const response = await apiClient.post('/attendance-config/shift-definitions', data);
  return response.data.data;
};

export const updateShiftDefinition = async (id: number, data: Partial<ShiftDefinitionFormData>): Promise<ShiftDefinition> => {
  const response = await apiClient.put(`/attendance-config/shift-definitions/${id}`, data);
  return response.data.data;
};

export const deleteShiftDefinition = async (id: number): Promise<void> => {
  await apiClient.delete(`/attendance-config/shift-definitions/${id}`);
};

// Add other attendance config service functions (settings, holidays, user-default-shifts) here later



// ... (existing ShiftDefinition CRUD functions) ...

// Ideal API call
export const getMonthlyAttendanceSummary = async (
  year: number,
  month: number,
  shiftDefinitionId?: number | null
): Promise<MonthlyAttendanceReportData> => {
  const response = await apiClient.get('/attendance/reports/monthly-summary', {
    params: { year, month, shift_definition_id: shiftDefinitionId === 0 ? null : shiftDefinitionId }, // Treat 0 or 'all' as no filter
  });
  return response.data; // Assumes backend returns this structure directly
};

// Fallback if you need to process daily sheet data on frontend:
export const fetchDailySheetForMonth = async (
  year: number,
  month: number,
): Promise<DailySheetResponse> => {
  const response = await apiClient.get('/attendance/daily-sheet', {
    params: { year, month },
  });
  return response.data;
};