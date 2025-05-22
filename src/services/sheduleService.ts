// src/services/scheduleService.ts
import apiClient from './api';
import type { DoctorScheduleEntry, DoctorWeeklySchedule } from '../types/schedules';

const API_BASE = '/doctors'; // Schedules are often nested under doctors
const SCHEDULE_API_URL = '/doctor-schedules'; // For general list if needed

export const getDoctorSchedules = async (doctorId?: number): Promise<DoctorScheduleEntry[]> => {
  const url = doctorId ? `${API_BASE}/${doctorId}/schedule` : SCHEDULE_API_URL;
  // Backend returns ResourceCollection, typically wrapped in 'data'
  const response = await apiClient.get<{ data: DoctorScheduleEntry[] }>(url);
  return response.data.data;
};

export const saveDoctorWeeklySchedule = async (doctorId: number, data: DoctorWeeklySchedule['schedules']): Promise<DoctorScheduleEntry[]> => {
  // Backend returns ResourceCollection
  const response = await apiClient.post<{ data: DoctorScheduleEntry[] }>(`${API_BASE}/${doctorId}/schedule`, { schedules: data });
  return response.data.data;
};