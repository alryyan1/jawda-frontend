import apiClient from "./api";
import type {
  AdmissionNursingAssignment,
  AdmissionNursingAssignmentFormData,
} from "../types/admissions";

const API_URL = "/admissions";

export const getAdmissionNursingAssignments = async (
  admissionId: number,
  filters?: { status?: string },
): Promise<AdmissionNursingAssignment[]> => {
  const response = await apiClient.get<{ data: AdmissionNursingAssignment[] }>(
    `${API_URL}/${admissionId}/nursing-assignments`,
    { params: filters },
  );
  return response.data.data;
};

export const createAdmissionNursingAssignment = async (
  admissionId: number,
  data: AdmissionNursingAssignmentFormData,
): Promise<{ data: AdmissionNursingAssignment }> => {
  const response = await apiClient.post<{ data: AdmissionNursingAssignment }>(
    `${API_URL}/${admissionId}/nursing-assignments`,
    data,
  );
  return response.data;
};

export const updateAdmissionNursingAssignment = async (
  admissionId: number,
  assignmentId: number,
  data: Partial<AdmissionNursingAssignmentFormData>,
): Promise<{ data: AdmissionNursingAssignment }> => {
  const response = await apiClient.put<{ data: AdmissionNursingAssignment }>(
    `${API_URL}/${admissionId}/nursing-assignments/${assignmentId}`,
    data,
  );
  return response.data;
};

export const deleteAdmissionNursingAssignment = async (
  admissionId: number,
  assignmentId: number,
): Promise<void> => {
  await apiClient.delete(
    `${API_URL}/${admissionId}/nursing-assignments/${assignmentId}`,
  );
};
