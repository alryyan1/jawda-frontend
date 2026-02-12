import apiClient from "./api";
import type { AdmissionSetting, AdmissionSettingFormData } from "@/types/admissionSettings";

export async function getAdmissionSettings(): Promise<AdmissionSetting> {
  const response = await apiClient.get<{ data: AdmissionSetting }>("/admission-settings");
  return response.data.data ?? response.data;
}

export async function updateAdmissionSettings(
  data: AdmissionSettingFormData
): Promise<AdmissionSetting> {
  const response = await apiClient.put<{ data: AdmissionSetting }>("/admission-settings", data);
  return response.data.data ?? response.data;
}
