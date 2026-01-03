import apiClient from './api';
import type {
  AdmissionRequestedLabTest,
  AdmissionRequestedLabTestFormData,
  AdmissionRequestedLabTestUpdateData,
} from '@/types/admissions';

/**
 * Get all requested lab tests for an admission
 */
export const getAdmissionLabTests = async (admissionId: number): Promise<AdmissionRequestedLabTest[]> => {
  const response = await apiClient.get<any>(
    `/admissions/${admissionId}/requested-lab-tests`
  );
  // API returns collection wrapped in data object: { data: [...] }
  if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as any).data)) {
    return (response.data as any).data;
  }
  // Fallback: if data is array directly
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Add lab tests to an admission
 */
export const addAdmissionLabTests = async (
  admissionId: number,
  data: AdmissionRequestedLabTestFormData
): Promise<{ message: string; lab_tests: AdmissionRequestedLabTest[] }> => {
  const response = await apiClient.post<{ message: string; lab_tests: AdmissionRequestedLabTest[] }>(
    `/admissions/${admissionId}/request-lab-tests`,
    data
  );
  return response.data;
};

/**
 * Update an admission requested lab test
 */
export const updateAdmissionLabTest = async (
  labTestId: number,
  data: AdmissionRequestedLabTestUpdateData
): Promise<{ data: AdmissionRequestedLabTest }> => {
  const response = await apiClient.put<{ data: AdmissionRequestedLabTest }>(
    `/admission-requested-lab-tests/${labTestId}`,
    data
  );
  return response.data;
};

/**
 * Delete an admission requested lab test
 */
export const deleteAdmissionLabTest = async (
  admissionId: number,
  labTestId: number
): Promise<void> => {
  await apiClient.delete(`/admissions/${admissionId}/requested-lab-tests/${labTestId}`);
};

