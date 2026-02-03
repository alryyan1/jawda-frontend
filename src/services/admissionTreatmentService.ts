import apiClient from "./api";
import type {
  AdmissionTreatment,
  AdmissionTreatmentFormData,
} from "../types/admissions";

const API_URL = "/admissions";

export const getAdmissionTreatments = async (
  admissionId: number,
): Promise<AdmissionTreatment[]> => {
  const response = await apiClient.get<{ data: AdmissionTreatment[] }>(
    `${API_URL}/${admissionId}/treatments`,
  );
  return response.data.data;
};

export const createAdmissionTreatment = async (
  admissionId: number,
  data: AdmissionTreatmentFormData,
): Promise<{ data: AdmissionTreatment }> => {
  const response = await apiClient.post<{ data: AdmissionTreatment }>(
    `${API_URL}/${admissionId}/treatments`,
    data,
  );
  return response.data;
};

export const updateAdmissionTreatment = async (
  admissionId: number,
  treatmentId: number,
  data: Partial<AdmissionTreatmentFormData>,
): Promise<{ data: AdmissionTreatment }> => {
  const response = await apiClient.put<{ data: AdmissionTreatment }>(
    `${API_URL}/${admissionId}/treatments/${treatmentId}`,
    data,
  );
  return response.data;
};

export const deleteAdmissionTreatment = async (
  admissionId: number,
  treatmentId: number,
): Promise<void> => {
  await apiClient.delete(
    `${API_URL}/${admissionId}/treatments/${treatmentId}`,
  );
};
