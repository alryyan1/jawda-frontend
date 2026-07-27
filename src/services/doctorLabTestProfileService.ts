// src/services/doctorLabTestProfileService.ts
import apiClient from "./api";
import type { DoctorLabTestProfile, DoctorLabTestProfileFormValues } from "@/types/doctorLabProfiles";

const BASE_URL = "/doctor-lab-test-profiles";

export const getMyLabTestProfiles = async (): Promise<DoctorLabTestProfile[]> => {
  const response = await apiClient.get<{ data: DoctorLabTestProfile[] }>(BASE_URL);
  return response.data.data;
};

export const createLabTestProfile = async (
  values: DoctorLabTestProfileFormValues
): Promise<DoctorLabTestProfile> => {
  const response = await apiClient.post<{ data: DoctorLabTestProfile }>(BASE_URL, values);
  return response.data.data;
};

export const updateLabTestProfile = async (
  profileId: number,
  values: DoctorLabTestProfileFormValues
): Promise<DoctorLabTestProfile> => {
  const response = await apiClient.put<{ data: DoctorLabTestProfile }>(`${BASE_URL}/${profileId}`, values);
  return response.data.data;
};

export const deleteLabTestProfile = async (profileId: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${profileId}`);
};
