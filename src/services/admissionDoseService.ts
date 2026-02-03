import apiClient from "./api";
import type { AdmissionDose, AdmissionDoseFormData } from "../types/admissions";

const API_URL = "/admissions";

export const getAdmissionDoses = async (
  admissionId: number,
  filters?: { active?: boolean },
): Promise<AdmissionDose[]> => {
  const response = await apiClient.get<{ data: AdmissionDose[] }>(
    `${API_URL}/${admissionId}/doses`,
    { params: filters },
  );
  return response.data.data;
};

export const createAdmissionDose = async (
  admissionId: number,
  data: AdmissionDoseFormData,
): Promise<{ data: AdmissionDose }> => {
  const response = await apiClient.post<{ data: AdmissionDose }>(
    `${API_URL}/${admissionId}/doses`,
    data,
  );
  return response.data;
};

export const updateAdmissionDose = async (
  admissionId: number,
  doseId: number,
  data: Partial<AdmissionDoseFormData>,
): Promise<{ data: AdmissionDose }> => {
  const response = await apiClient.put<{ data: AdmissionDose }>(
    `${API_URL}/${admissionId}/doses/${doseId}`,
    data,
  );
  return response.data;
};

export const deleteAdmissionDose = async (
  admissionId: number,
  doseId: number,
): Promise<void> => {
  await apiClient.delete(`${API_URL}/${admissionId}/doses/${doseId}`);
};
