import apiClient from './api';
import type { Admission, AdmissionFormData, DischargeFormData, TransferFormData, PaginatedAdmissionsResponse } from '../types/admissions';
import type { PaginatedResponse } from '@/types/common';

const API_URL = '/admissions';

export const getAdmissions = async (page = 1, filters: Record<string, string | number | boolean> = {}): Promise<PaginatedAdmissionsResponse> => {
  const response = await apiClient.get<PaginatedAdmissionsResponse>(API_URL, { 
    params: { page, ...filters } 
  });
  return response.data;
};

export const getAdmissionById = async (id: number): Promise<{ data: Admission }> => {
  const response = await apiClient.get<{ data: Admission }>(`${API_URL}/${id}`);
  return response.data;
};

export const createAdmission = async (data: AdmissionFormData): Promise<{ data: Admission }> => {
  const payload = {
    patient_id: parseInt(String(data.patient_id)),
    ward_id: parseInt(String(data.ward_id)),
    room_id: parseInt(String(data.room_id)),
    bed_id: parseInt(String(data.bed_id)),
    admission_date: data.admission_date ? data.admission_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    admission_time: data.admission_time || null,
    admission_type: data.admission_type || null,
    admission_reason: data.admission_reason || null,
    diagnosis: data.diagnosis || null,
    doctor_id: data.doctor_id ? parseInt(String(data.doctor_id)) : null,
    notes: data.notes || null,
  };
  const response = await apiClient.post<{ data: Admission }>(API_URL, payload);
  return response.data;
};

export const updateAdmission = async (id: number, data: Partial<AdmissionFormData>): Promise<{ data: Admission }> => {
  const payload: Record<string, any> = {};
  if (data.admission_reason !== undefined) payload.admission_reason = data.admission_reason;
  if (data.diagnosis !== undefined) payload.diagnosis = data.diagnosis;
  if (data.doctor_id !== undefined) payload.doctor_id = data.doctor_id ? parseInt(String(data.doctor_id)) : null;
  if (data.notes !== undefined) payload.notes = data.notes;
  
  const response = await apiClient.put<{ data: Admission }>(`${API_URL}/${id}`, payload);
  return response.data;
};

export const dischargeAdmission = async (id: number, data: DischargeFormData): Promise<{ data: Admission }> => {
  const payload: Record<string, any> = {};
  if (data.discharge_date) {
    payload.discharge_date = data.discharge_date.toISOString().split('T')[0];
  }
  if (data.discharge_time !== undefined) payload.discharge_time = data.discharge_time;
  if (data.notes !== undefined) payload.notes = data.notes;
  
  const response = await apiClient.put<{ data: Admission }>(`${API_URL}/${id}/discharge`, payload);
  return response.data;
};

export const transferAdmission = async (id: number, data: TransferFormData): Promise<{ data: Admission }> => {
  const payload = {
    ward_id: parseInt(String(data.ward_id)),
    room_id: parseInt(String(data.room_id)),
    bed_id: parseInt(String(data.bed_id)),
    notes: data.notes || null,
  };
  const response = await apiClient.put<{ data: Admission }>(`${API_URL}/${id}/transfer`, payload);
  return response.data;
};

export const getActiveAdmissions = async (filters: { ward_id?: number } = {}): Promise<Admission[]> => {
  const response = await apiClient.get<{ data: Admission[] }>(`${API_URL}/active`, { params: filters });
  return response.data.data;
};

