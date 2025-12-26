import apiClient from './api';
import type { AdmissionVitalSign, AdmissionVitalSignFormData } from '@/types/admissions';

export const getAdmissionVitalSigns = async (
  admissionId: number,
  filters?: { start_date?: string; end_date?: string }
): Promise<AdmissionVitalSign[]> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await apiClient.get<{ data: AdmissionVitalSign[] }>(
    `/admissions/${admissionId}/vital-signs${params.toString() ? `?${params.toString()}` : ''}`
  );
  return Array.isArray(response.data?.data) ? response.data.data : response.data || [];
};

export const addVitalSign = async (
  admissionId: number,
  data: AdmissionVitalSignFormData
): Promise<AdmissionVitalSign> => {
  const response = await apiClient.post<{ data: AdmissionVitalSign }>(
    `/admissions/${admissionId}/vital-signs`,
    data
  );
  return response.data.data || response.data;
};

export const updateVitalSign = async (
  vitalSignId: number,
  data: Partial<AdmissionVitalSignFormData>
): Promise<AdmissionVitalSign> => {
  const response = await apiClient.put<{ data: AdmissionVitalSign }>(
    `/admission-vital-signs/${vitalSignId}`,
    data
  );
  return response.data.data || response.data;
};

export const deleteVitalSign = async (vitalSignId: number): Promise<void> => {
  await apiClient.delete(`/admission-vital-signs/${vitalSignId}`);
};

